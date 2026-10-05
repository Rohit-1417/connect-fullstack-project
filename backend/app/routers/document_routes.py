import os
import uuid
import pymupdf
import json
import numpy as np

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from app.schemas.document import DocumentQuestion

from app.database import models
from app.database.database import get_db
from app.auth import get_current_user
from google import genai
import faiss

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=GEMINI_API_KEY)

VECTORSTORE_DIR = "uploads/vectorstores"

os.makedirs(VECTORSTORE_DIR, exist_ok=True)



def extract_pdf_text(file_path):
    pdf = pymupdf.open(file_path)

    text = ""

    for page in pdf:
        text += page.get_text()

    pdf.close()

    return text




def split_text_into_chunks(text, chunk_size=1000, overlap=200):
    chunks = []

    start = 0

    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]

        if chunk.strip():
            chunks.append(chunk)

        start += chunk_size - overlap

    return chunks



def generate_embeddings(chunks):
    embeddings = []

    for chunk in chunks:
        response = client.models.embed_content(
            model="gemini-embedding-2",
            contents=chunk
        )

        embeddings.append(response.embeddings[0].values)

    return embeddings


def create_faiss_index(embeddings):
    dimension = len(embeddings[0])

    index = faiss.IndexFlatL2(dimension)

    index.add(
        __import__("numpy").array(embeddings, dtype="float32")
    )

    return index



def save_faiss_index(index, document_id):
    document_vectorstore_dir = os.path.join(
        VECTORSTORE_DIR,
        f"document_{document_id}"
    )

    os.makedirs(document_vectorstore_dir, exist_ok=True)

    index_path = os.path.join(
        document_vectorstore_dir,
        "index.faiss"
    )

    faiss.write_index(index, index_path)

    return index_path



def save_chunks(chunks, document_id):
    document_vectorstore_dir = os.path.join(
        VECTORSTORE_DIR,
        f"document_{document_id}"
    )

    os.makedirs(document_vectorstore_dir, exist_ok=True)

    chunks_path = os.path.join(
        document_vectorstore_dir,
        "chunks.json"
    )

    with open(chunks_path, "w", encoding="utf-8") as file:
        json.dump(chunks, file, ensure_ascii=False, indent=2)

    return chunks_path




def load_faiss_index(document_id):
    document_vectorstore_dir = os.path.join(
        VECTORSTORE_DIR,
        f"document_{document_id}"
    )

    index_path = os.path.join(
        document_vectorstore_dir,
        "index.faiss"
    )

    if not os.path.exists(index_path):
        raise HTTPException(
            status_code=404,
            detail="Vector index not found"
        )

    index = faiss.read_index(index_path)

    return index




def load_chunks(document_id):
    document_vectorstore_dir = os.path.join(
        VECTORSTORE_DIR,
        f"document_{document_id}"
    )

    chunks_path = os.path.join(
        document_vectorstore_dir,
        "chunks.json"
    )

    if not os.path.exists(chunks_path):
        raise HTTPException(
            status_code=404,
            detail="Chunks file not found"
        )

    with open(chunks_path, "r", encoding="utf-8") as file:
        chunks = json.load(file)

    return chunks




def search_relevant_chunks(question, index, chunks, top_k=3):
    response = client.models.embed_content(
        model="gemini-embedding-2",
        contents=question
    )

    question_vector = response.embeddings[0].values

    question_vector = np.array(
        [question_vector],
        dtype="float32"
    )

    distances, indices = index.search(
        question_vector,
        top_k
    )

    relevant_chunks = []

    for index_position in indices[0]:
        if index_position != -1:
            relevant_chunks.append(chunks[index_position])

    return relevant_chunks





router = APIRouter(
    prefix="/api",
    tags=["Documents"]
)





@router.post("/documents")
def upload_document(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Check whether the uploaded file is a PDF
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed"
        )

    # 2. Get the logged-in user's ID
    user_id = current_user["user_id"]

    # 3. Keep the original filename and create a unique filename
    original_filename = os.path.basename(file.filename)
    unique_filename = f"{uuid.uuid4()}_{original_filename}"

    # 4. Create the upload directory
    upload_dir = "uploads/documents"
    os.makedirs(upload_dir, exist_ok=True)

    # 5. Create the complete file path
    file_path = os.path.join(upload_dir, unique_filename)

    # 6. Save the PDF to the folder
    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())

    # 7. Save document information in MySQL
    document = models.Document(
        user_id=user_id,
        file_name=original_filename,
        file_path=file_path
    )

    db.add(document)
    db.flush()


    # 8. Extract text, create chunks, embeddings and FAISS index
    text = extract_pdf_text(file_path)

    if not text.strip():
        raise HTTPException(
        status_code=400,
        detail="Could not extract text from this PDF"
    )

    chunks = split_text_into_chunks(text)

    if not chunks:
        raise HTTPException(
        status_code=400,
        detail="No text chunks were created from this PDF"
    )

    embeddings = generate_embeddings(chunks)

    index = create_faiss_index(embeddings)

    save_faiss_index(index, document.id)

    save_chunks(chunks, document.id)


    db.commit()
    db.refresh(document)

    # 9. Return success response
    return {
        "message": "Document uploaded successfully",
        "document_id": document.id,
        "file_name": document.file_name
    }





@router.get("/documents")
def get_documents(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["user_id"]

    documents = db.query(models.Document).filter(
        models.Document.user_id == user_id
    ).all()

    result = []

    for document in documents:
        result.append({
            "document_id": document.id,
            "file_name": document.file_name,
            "created_at": document.created_at
        })

    return {
        "documents": result
    }






@router.post("/documents/{document_id}/ask")
def ask_question(
    document_id: int,
    question_data: DocumentQuestion,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["user_id"]

    # 1. Find the document
    document = db.query(models.Document).filter(
        models.Document.id == document_id,
        models.Document.user_id == user_id
    ).first()

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    # 2. Load FAISS index
    index = load_faiss_index(document_id)

    # 3. Load original PDF chunks
    chunks = load_chunks(document_id)

    # 4. Find relevant chunks
    relevant_chunks = search_relevant_chunks(
        question_data.question,
        index,
        chunks
    )

    if not relevant_chunks:
        raise HTTPException(
            status_code=404,
            detail="No relevant information found in the document"
        )

    # 5. Combine relevant chunks
    context = "\n\n".join(relevant_chunks)

    # 6. Ask Gemini
    prompt = f"""
You are answering a question about a PDF document.

Use only the information provided in the context below.

If the answer is not available in the context,
say that the information is not available in the document.

Context:
{context}

Question:
{question_data.question}

Answer:
"""

    response = client.models.generate_content(
        model="gemini-3.8-flash",
        contents=prompt
    )

    answer = response.text

    # 7. Save question and answer
    ai_question = models.AIQuestion(
        user_id=user_id,
        document_id=document_id,
        question=question_data.question,
        answer=answer
    )

    db.add(ai_question)
    db.commit()
    db.refresh(ai_question)

    # 8. Return answer
    return {
        "document_id": document_id,
        "question": question_data.question,
        "answer": answer
    }





@router.get("/documents/{document_id}/questions")
def get_document_questions(
    document_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["user_id"]

    # 1. Check that the document belongs to the logged-in user
    document = db.query(models.Document).filter(
        models.Document.id == document_id,
        models.Document.user_id == user_id
    ).first()

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    # 2. Get all questions for this document
    questions = db.query(models.AIQuestion).filter(
        models.AIQuestion.document_id == document_id,
        models.AIQuestion.user_id == user_id
    ).order_by(
        models.AIQuestion.created_at.desc()
    ).all()

    # 3. Prepare response
    result = []

    for item in questions:
        result.append({
            "id": item.id,
            "question": item.question,
            "answer": item.answer,
            "created_at": item.created_at
        })

    return {
        "document_id": document_id,
        "questions": result
    }