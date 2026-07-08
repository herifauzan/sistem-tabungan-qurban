Act as an Expert Full-Stack Developer and Cloud Architect. Your task is to build a web application for a Qurban (Islamic Sacrifice) Savings System for "Masjid Al-Bina". 

# 1. Architecture & Tech Stack
- Frontend & Backend: Next.js (App Router) with TypeScript.
- Styling: Tailwind CSS (Mobile-responsive, clean, minimalist UI).
- Database: Google Sheets API (acting as a relational database).
- File Storage: Google Drive API (for uploading transfer receipts).
- Deployment: Containerized using Docker, ready for Google Cloud Run (stateless).
- Authentication: NextAuth.js (Credentials provider with hashed passwords) or simple JWT-based auth via API routes.

# 2. Google Workspace Integration Requirements
- The app must connect to Google APIs using a Service Account JSON key (passed via Environment Variables).
- Write a robust utility class/module to handle Google Sheets API (read/write/update rows) and Google Drive API (upload images, get webViewLink).
- Implement basic rate-limiting handling and error retries for the Google API calls.

# 3. Data Schema (Google Sheets mapping)
Assume the following sheets exist in the spreadsheet:
- Sheet "Jamaah" (Users): ID, Name, Phone, Password_Hash, Role (Admin/User), Total_Saved.
- Sheet "Tipe_Qurban" (Qurban Types): ID, Animal_Name, Price, Quota.
- Sheet "Transaksi" (Transactions): ID, Date, User_ID, Amount, Receipt_Drive_File_ID, Status (Pending/Approved/Rejected).

# 4. Core Functional Requirements
Implement the following features and UI pages:

A. Authentication (Public)
- Login and Registration pages. 
- Distinguish between 'Admin' and 'User' roles upon login.

B. User Dashboard (Jamaah)
- View current savings progress vs. target Qurban price.
- Form to submit a new savings deposit: requires inputting the amount and uploading an image (transfer receipt).
- The uploaded image must be sent to Google Drive, and the transaction record saved to Google Sheets with "Pending" status.
- A table showing transaction history and their validation statuses.

C. Admin Dashboard (Takmir)
- Overview statistics: Total funds collected, total users, pending validations.
- Validation Interface: A table of "Pending" transactions with a button to view the receipt image (from Google Drive) and actions to "Approve" or "Reject".
- Approving a transaction must update the transaction status in the "Transaksi" sheet and recalculate/update the user's Total_Saved in the "Jamaah" sheet.

# 5. Output Generation Steps
Please generate the code in the following order:
1. Initialize the project structure and provide the `package.json`.
2. Provide the `.env.example` file detailing the required Google Service Account and Spreadsheet IDs.
3. Write the Google API integration utility files (`drive.ts` and `sheets.ts`).
4. Write the API routes (Backend).
5. Build the Frontend components and pages.
6. Provide a production-ready `Dockerfile` optimized for Google Cloud Run deployment (multi-stage build, exposing port 8080).