# Spec: Rename Upload Button

## MODIFIED Requirements

#### Scenario: Upload Button Text

- **Given** the New Case page
- **When** the user looks at the file upload button
- **Then** it should read "讀取多筆代書拜望錄(.docx)" instead of "讀取案件單 (.docx)".

#### Scenario: Edit Case Upload Text

- **Given** the Edit Case page (Basic Info)
- **When** the user looks at the re-upload button
- **Then** it should read "重新讀取代書拜望錄(.docx)".
