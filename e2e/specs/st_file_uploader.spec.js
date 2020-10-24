/**
 * @license
 * Copyright 2018-2020 Streamlit Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

describe("st.file_uploader", () => {
  beforeEach(() => {
    Cypress.Cookies.defaults({
      whitelist: ["_xsrf"]
    });

    cy.visit("http://localhost:3000/");

    // Make the ribbon decoration line disappear
    cy.get(".decoration").invoke("css", "display", "none");
  });

  it("shows widget correctly", () => {
    cy.get(".stFileUploader")
      .first()
      .should("exist");
    cy.get(".stFileUploader label")
      .first()
      .should("have.text", "Drop a file:");

    cy.get(".stFileUploader")
      .first()
      .matchImageSnapshot("single_file_uploader");

    cy.get(".stFileUploader")
      .last()
      .matchImageSnapshot("multi_file_uploader");
  });

  it("shows deprecation warning", () => {
    cy.get(".stFileUploader")
      .first()
      .parent()
      .prev()
      .should("contain", "FileUploaderEncodingWarning");
  });

  it("hides deprecation warning", () => {
    cy.get(".stFileUploader")
      .last()
      .parent()
      .prev()
      .should("not.contain", "FileUploaderEncodingWarning");
  });

  it("shows error message for not allowed files", () => {
    const fileName = "example.json";

    cy.fixture(fileName).then(fileContent => {
      cy.get(".fileUploadDropzone")
        .first()
        .upload(
          { fileContent, fileName, mimeType: "application/json" },
          {
            force: true,
            subjectType: "drag-n-drop",

            // We intentionally omit the "dragleave" trigger event here;
            // the page may start re-rendering after the "drop" event completes,
            // which causes a cypress error due to the element being detached
            // from the DOM when "dragleave" is emitted.
            events: ["dragenter", "drop"]
          }
        );

      cy.get(".fileError span")
        .first()
        .should("have.text", "application/json files are not allowed.");

      cy.get(".stFileUploader")
        .first()
        .matchImageSnapshot("file_uploader-error");
    });
  });

  it("uploads single file only", () => {
    const fileName1 = "file1.txt";
    const fileName2 = "file2.txt";

    // Yes, this actually is the recommended way to load multiple fixtures
    // in Cypress (!!) using Cypress.Promise.all is buggy. See:
    // https://github.com/cypress-io/cypress-example-recipes/blob/master/examples/fundamentals__fixtures/cypress/integration/multiple-fixtures-spec.js
    cy.fixture(fileName1).then(file1 => {
      cy.fixture(fileName2).then(file2 => {
        const files = [
          { fileContent: file1, fileName: fileName1, mimeType: "text/plain" },
          { fileContent: file2, fileName: fileName2, mimeType: "text/plain" }
        ];

        cy.get(".fileUploadDropzone")
          .eq(0)
          .upload(files[0], {
            force: true,
            subjectType: "drag-n-drop",
            events: ["dragenter", "drop"]
          });

        // The script should have printed the contents of the two files
        // into an st.text. (This tests that the upload actually went
        // through.)
        cy.get(".uploadedFileName").should("have.text", fileName1);
        cy.get(".fixed-width.stText")
          .first()
          .should("contain.text", file1);

        cy.get(".stFileUploader")
          .first()
          .matchImageSnapshot("single_file_uploader-uploaded");

        cy.get(".fileUploadDropzone")
          .eq(0)
          .upload(files[1], {
            force: true,
            subjectType: "drag-n-drop",
            events: ["dragenter", "drop"]
          });

        cy.get(".uploadedFileName")
          .should("have.text", fileName2)
          .should("not.have.text", fileName1);
        cy.get(".fixed-width.stText")
          .first()
          .should("contain.text", file2)
          .should("not.contain.text", file1);
      });
    });
  });

  it("uploads multiple files", () => {
    const fileName1 = "file1.txt";
    const fileName2 = "file2.txt";

    // Yes, this actually is the recommended way to load multiple fixtures
    // in Cypress (!!) using Cypress.Promise.all is buggy. See:
    // https://github.com/cypress-io/cypress-example-recipes/blob/master/examples/fundamentals__fixtures/cypress/integration/multiple-fixtures-spec.js
    cy.fixture(fileName1).then(file1 => {
      cy.fixture(fileName2).then(file2 => {
        const files = [
          { fileContent: file1, fileName: fileName1, mimeType: "text/plain" },
          { fileContent: file2, fileName: fileName2, mimeType: "text/plain" }
        ];

        cy.get(".fileUploadDropzone")
          .eq(1)
          .upload(files, {
            force: true,
            subjectType: "drag-n-drop",
            events: ["dragenter", "drop"]
          });

        // The widget should show the names of the uploaded files in reverse
        // order
        const filenames = [fileName2, fileName1];
        cy.get(".uploadedFileName").each((uploadedFileName, index) => {
          cy.get(uploadedFileName).should("have.text", filenames[index]);
        });

        // The script should have printed the contents of the two files
        // into an st.text. (This tests that the upload actually went
        // through.)
        const content = [file1, file2].sort().join("\n");
        cy.get(".fixed-width.stText")
          .last()
          .should("have.text", content);

        cy.get(".stFileUploader")
          .last()
          .matchImageSnapshot("multi_file_uploader-uploaded");
      });
    });
  });
});
