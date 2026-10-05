document.addEventListener("DOMContentLoaded", async function () {

    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const fileInput = document.getElementById("documentFile");
    const selectedFile = document.getElementById("selectedFile");
    const uploadForm = document.getElementById("uploadForm");
    const uploadButton = document.getElementById("uploadButton");

    const documentsList = document.getElementById("documentsList");

    const selectedDocumentName =
        document.getElementById("selectedDocumentName");

    const questionForm =
        document.getElementById("questionForm");

    const questionInput =
        document.getElementById("questionInput");

    const askButton =
        document.getElementById("askButton");

    const questionStatus =
        document.getElementById("questionStatus");

    const aiAnswer =
        document.getElementById("aiAnswer");

    const qaList =
        document.getElementById("qaList");

    let selectedDocumentId = null;


    /* =========================
       LOAD PROFILE
    ========================= */

    try {

        const profile =
            await apiRequest("/api/profile");

        const userName =
            document.getElementById("userName");

        const userRole =
            document.getElementById("userRole");

        const userAvatar =
            document.getElementById("userAvatar");


        if (userName) {
            userName.textContent =
                profile.full_name;
        }


        if (userRole) {
            userRole.textContent =
                profile.role || "User";
        }


        if (userAvatar) {
            userAvatar.textContent =
                profile.full_name
                    .charAt(0)
                    .toUpperCase();
        }

    } catch (error) {

        console.error(
            "Profile error:",
            error
        );

        handleAuthError(error);

        return;
    }


    /* =========================
       FILE SELECTION
    ========================= */

    fileInput.addEventListener(
        "change",
        function () {

            const file =
                fileInput.files[0];


            if (!file) {

                selectedFile.textContent =
                    "No file selected";

                return;
            }


            if (file.type !== "application/pdf") {

                selectedFile.textContent =
                    "Please select a PDF file.";

                fileInput.value = "";

                return;
            }


            selectedFile.textContent =
                file.name;
        }
    );


    /* =========================
       UPLOAD PDF
    ========================= */

    uploadForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const file =
                fileInput.files[0];


            if (!file) {

                showUploadMessage(
                    "Please select a PDF file first."
                );

                return;
            }


            if (file.type !== "application/pdf") {

                showUploadMessage(
                    "Only PDF files are allowed."
                );

                return;
            }


            uploadButton.disabled = true;

            uploadButton.textContent =
                "Uploading...";


            showUploadMessage(
                "Processing your PDF. Please wait..."
            );


            try {

                const formData =
                    new FormData();


                formData.append(
                    "file",
                    file
                );


                const response =
                    await fetch(
                        `${API_BASE_URL}/api/documents`,
                        {
                            method: "POST",

                            headers: {
                                "Authorization":
                                    `Bearer ${token}`
                            },

                            body: formData
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Upload failed"
                    );
                }


                showUploadMessage(
                    "Document uploaded successfully."
                );


                uploadForm.reset();


                selectedFile.textContent =
                    "No file selected";


                await loadDocuments();


            } catch (error) {

                console.error(
                    "Upload error:",
                    error
                );


                showUploadMessage(
                    error.message ||
                    "Failed to upload document."
                );


                handleAuthError(error);

            } finally {

                uploadButton.disabled =
                    false;

                uploadButton.textContent =
                    "Upload Document";
            }

        }
    );


    /* =========================
       LOAD DOCUMENTS
    ========================= */

    async function loadDocuments() {

        try {

            documentsList.innerHTML = `
                <div class="loading-message">
                    Loading documents...
                </div>
            `;


            const data =
                await apiRequest(
                    "/api/documents"
                );


            const documents =
                data.documents || [];


            if (documents.length === 0) {

                documentsList.innerHTML = `
                    <div class="empty-message">
                        You haven't uploaded any documents yet.
                    </div>
                `;

                return;
            }


            documentsList.innerHTML = "";


            /*
             * IMPORTANT:
             * Use "doc" here instead of "document".
             * "document" is the browser's global document object.
             */

            documents.forEach(function (doc) {

                const item =
                    document.createElement("div");


                item.className =
                    "document-item";


                item.dataset.documentId =
                    doc.document_id;


                const formattedDate =
                    formatDate(
                        doc.created_at
                    );


                item.innerHTML = `
                    <div class="document-info">

                        <div class="document-icon">
                            PDF
                        </div>

                        <div class="document-details">

                            <p class="document-name">
                                ${escapeHtml(
                                    doc.file_name
                                )}
                            </p>

                            <div class="document-date">
                                Uploaded ${formattedDate}
                            </div>

                        </div>

                    </div>

                    <div class="document-select">
                        Select
                    </div>
                `;


                item.addEventListener(
                    "click",
                    function () {

                        selectDocument(
                            doc.document_id,
                            doc.file_name,
                            item
                        );

                    }
                );


                documentsList.appendChild(
                    item
                );

            });


        } catch (error) {

            console.error(
                "Documents loading error:",
                error
            );


            documentsList.innerHTML = `
                <div class="empty-message">
                    Failed to load documents.
                </div>
            `;


            handleAuthError(error);
        }
    }


    /* =========================
       SELECT DOCUMENT
    ========================= */

    async function selectDocument(
        documentId,
        fileName,
        element
    ) {

        selectedDocumentId =
            documentId;


        document
            .querySelectorAll(".document-item")
            .forEach(function (item) {

                item.classList.remove(
                    "selected"
                );


                const button =
                    item.querySelector(
                        ".document-select"
                    );


                if (button) {

                    button.textContent =
                        "Select";
                }

            });


        element.classList.add(
            "selected"
        );


        const selectButton =
            element.querySelector(
                ".document-select"
            );


        if (selectButton) {

            selectButton.textContent =
                "Selected";
        }


        selectedDocumentName.textContent =
            fileName;


        askButton.disabled =
            false;


        aiAnswer.innerHTML = `
            <div class="answer-placeholder">

                <span class="answer-icon">
                    ✦
                </span>

                <p>
                    Ask a question about this document.
                </p>

            </div>
        `;


        questionInput.value = "";


        questionStatus.textContent =
            "";


        await loadQuestionHistory(
            documentId
        );
    }


    /* =========================
       ASK AI
    ========================= */

    questionForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            if (!selectedDocumentId) {

                questionStatus.textContent =
                    "Please select a document.";

                return;
            }


            const question =
                questionInput.value.trim();


            if (!question) {

                questionStatus.textContent =
                    "Please enter a question.";

                return;
            }


            askButton.disabled =
                true;


            askButton.textContent =
                "Thinking...";


            questionStatus.textContent =
                "Searching your document...";


            try {

                const data =
                    await apiRequest(
                        `/api/documents/${selectedDocumentId}/ask`,
                        {
                            method: "POST",

                            body: JSON.stringify({
                                question: question
                            })
                        }
                    );


                const answer =
                    data.answer ||
                    "No answer received.";


                aiAnswer.innerHTML = `
                    <div class="answer-heading">
                        AI Answer
                    </div>

                    <div class="answer-content">
                        ${escapeHtml(answer)}
                    </div>
                `;


                questionStatus.textContent =
                    "Answer generated successfully.";


                questionInput.value = "";


                await loadQuestionHistory(
                    selectedDocumentId
                );


            } catch (error) {

                console.error(
                    "AI question error:",
                    error
                );


                aiAnswer.innerHTML = `
                    <div class="answer-placeholder">

                        <span class="answer-icon">
                            !
                        </span>

                        <p>
                            ${escapeHtml(
                                error.message ||
                                "Failed to get an answer."
                            )}
                        </p>

                    </div>
                `;


                questionStatus.textContent =
                    "Something went wrong.";


                handleAuthError(error);

            } finally {

                askButton.disabled =
                    false;


                askButton.textContent =
                    "Ask AI";
            }

        }
    );


    /* =========================
       QUESTION HISTORY
    ========================= */

    async function loadQuestionHistory(
        documentId
    ) {

        try {

            qaList.innerHTML = `
                <div class="loading-message">
                    Loading question history...
                </div>
            `;


            const data =
                await apiRequest(
                    `/api/documents/${documentId}/questions`
                );


            const questions =
                data.questions || [];


            if (questions.length === 0) {

                qaList.innerHTML = `
                    <div class="empty-message">
                        No previous questions for this document.
                    </div>
                `;

                return;
            }


            qaList.innerHTML = "";


            questions.forEach(function (item) {

                const qaItem =
                    document.createElement(
                        "div"
                    );


                qaItem.className =
                    "qa-item";


                qaItem.innerHTML = `
                    <p class="qa-question">
                        ${escapeHtml(
                            item.question
                        )}
                    </p>

                    <p class="qa-answer">
                        ${escapeHtml(
                            item.answer
                        )}
                    </p>

                    <div class="qa-date">
                        ${formatDate(
                            item.created_at
                        )}
                    </div>
                `;


                qaList.appendChild(
                    qaItem
                );

            });


        } catch (error) {

            console.error(
                "Question history error:",
                error
            );


            qaList.innerHTML = `
                <div class="empty-message">
                    Failed to load question history.
                </div>
            `;
        }
    }


    /* =========================
       UPLOAD MESSAGE
    ========================= */

    function showUploadMessage(
        message
    ) {

        const uploadMessage =
            document.getElementById(
                "uploadMessage"
            );


        uploadMessage.textContent =
            message;


        uploadMessage.classList.add(
            "show"
        );
    }


    /* =========================
       DATE FORMAT
    ========================= */

    function formatDate(
        dateString
    ) {

        if (!dateString) {
            return "Unknown date";
        }


        const date =
            new Date(dateString);


        return date.toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );
    }


    /* =========================
       HTML SAFETY
    ========================= */

    function escapeHtml(
        value
    ) {

        const div =
            document.createElement(
                "div"
            );


        div.textContent =
            value ?? "";


        return div.innerHTML;
    }


    /* =========================
       AUTH ERROR
    ========================= */

    function handleAuthError(
        error
    ) {

        const message =
            error?.message?.toLowerCase() ||
            "";


        if (
            message.includes("token") ||
            message.includes("invalid") ||
            message.includes("expired")
        ) {

            localStorage.removeItem(
                "access_token"
            );


            window.location.href =
                "login.html";
        }
    }


    /* =========================
       LOGOUT
    ========================= */

    window.logout = function () {

        localStorage.removeItem(
            "access_token"
        );


        window.location.href =
            "login.html";
    };


    /* =========================
       INITIAL LOAD
    ========================= */

    await loadDocuments();

});