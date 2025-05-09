# SureSight: A Roofing & Siding Damage Assessment Application
An app to streamline the process of identifying and reporting roofing and siding damage, ultimately helping homeowners, contractors, and insurance adjusters!

## Table of Contents
- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Features](#features)
- [Target Users](#target-users)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Current Progress](#current-progress)
- [Installation & Setup](#installation--setup)
- [Development Environment](#development-environment)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Testing](#testing)
- [Database Management](#database-management)
- [Future Enhancements](#future-enhancements)
- [Contributors](#contributors)
- [Data Contributors](#data-contributors)
- [License](#license)

## Overview
**SureSight** is a user-friendly tool that leverages Next.js and **Artificial Intelligence (AI)** to assist homeowners, contractors, and insurance adjusters evaluate damage caused by severe weather events. The application simplifies inspection by providing automated damage detection, classification, and cost estimation.

## Problem Statement
Severe weather conditions, such as hailstorms, hurricanes, and strong winds, frequently damage roofing and siding. Current assessment methods rely on manual inspections, which can be time-consuming, costly, and prone to human error. Additionally, existing solutions often lack accessibility, accuracy, and integration with modern technologies.

Key challenges include:
- Homeowners struggling to assess damage accurately, leading to delays in repairs.
- Contractors manually documenting damage, resulting in inefficiencies.
- Insurance adjusters require standardized and precise reports to process claims.

## Solution
This application provides a **smart, AI-driven** approach to damage assessment, streamlining the process through:
- **AI-powered image recognition** to identify and classify damage severity.
- **Automated cost estimation** based on material type, damage extent, and local repair rates.
- **Standardized report generation** to assist insurance claims and contractor assessments.

## Features
- 📸 **Automated Damage Detection** – Upload images of roofing and siding for instant analysis.
- 🔍 **AI-Powered Severity Classification** – Distinguish between superficial and structural damage.
- 💰 **Cost Estimation** – Calculate repair costs based on local market rates.
- 📑 **Standardized Reports** – Generate professional assessment reports for contractors and insurers.
- ☁️ **Cloud Storage Integration** – Securely store assessments and retrieve them anytime.
- 👥 **User Role Management** – Different interfaces and permissions for homeowners, contractors, and adjusters.
- 📱 **Responsive Design** – Optimized for both desktop and mobile devices.
- 🔔 **Notification System** – Real-time updates on assessment progress and claim status.

## Target Users
- **Homeowners** – Quickly assess damage and obtain repair estimates.
- **Contractors** – Improve efficiency in damage documentation and quoting.
- **Insurance Adjusters** – Streamline claim processing with standardized reports.

## Technology Stack
| Component | Technology |
|--------------|------------|
| **Frontend** | Next.js, React, Tailwind CSS |
| **Backend** | Supabase Edge Functions |
| **Machine Learning** | Google Cloud Vision AI |
| **Database** | PostgreSQL via Supabase |
| **Authentication** | Supabase Auth |
| **Storage** | Supabase Storage |
| **Hosting** | Vercel |
| **Testing** | Jest, React Testing Library |
| **CI/CD** | GitHub Actions |

## Project Structure
The SureSight project is organized into the following directory structure:

```
SureSight/
├── components/          # Reusable React components
│   ├── auth/            # Authentication-related components
│   ├── common/          # Shared UI elements
│   ├── layout/          # Page layout components
│   └── ui/              # Base UI components
├── pages/               # Next.js pages
│   ├── api/             # API routes
│   └── reports/         # Report-related pages
├── public/              # Static assets
├── styles/              # CSS and styling files
├── utils/               # Utility functions
├── types/               # TypeScript type definitions
├── supabase/            # Supabase configurations and functions
├── services/            # Service layer for external APIs
├── __tests__/           # Test files
├── _sql/                # SQL scripts for database management
└── docs/                # Documentation files
```

## Current Progress

The project is currently in active development with the following components implemented:

### Completed
- ✅ User authentication system (signup, login, password reset)
- ✅ Profile management for different user roles
- ✅ Basic dashboard UI for viewing reports and properties
- ✅ Image upload functionality with storage integration
- ✅ Database schema and Row Level Security (RLS) policies
- ✅ Notification system for real-time updates
- ✅ Initial AI model integration for damage detection
- ✅ Comprehensive test suite for core functionalities

### In Progress
- 🔄 Advanced damage classification algorithms
- 🔄 Cost estimation module based on damage assessment
- 🔄 Report generation with detailed damage analysis
- 🔄 Mobile responsive design improvements
- 🔄 User experience enhancements

## Installation & Setup

To set up the project locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/SureSight.git
   cd SureSight
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file with the following variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Access the application at `http://localhost:3000`

## Development Environment

### Prerequisites
- Node.js 16.x or higher
- npm 7.x or higher
- Supabase account for backend services
- Google Cloud account (for Vision AI integration)

### Recommended Tools
- Visual Studio Code with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - Jest Runner
- Supabase CLI for database management
- Postman for API testing

### Code Style
This project follows strict TypeScript conventions and uses ESLint/Prettier for code formatting. To check for linting issues:
```bash
npm run lint
```

## Deployment
Go to [SureSight.app](https://suresight.app) to see it in action!

To deploy this project on Vercel:

1. Ensure you have a Vercel account.
2. Install the Vercel CLI by running:
   ```bash
   npm install -g vercel
   ```
3. Verify the installation by running:
   ```bash
   vercel --version
   ```
   If the command is not recognized, ensure that your Node.js global `bin` directory is added to your system's PATH.
4. Set the required environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel dashboard.
5. Run the following commands:
   ```bash
   npm install
   npm run build
   vercel dev
   ```
6. Connect your GitHub repository to Vercel for automatic deployments.

## Documentation

SureSight's documentation is distributed across several files in the repository:

### Core Documentation
- [Main README](./README.md) - This file, providing an overview of the entire project
- [Supabase Reference](./supabase/referance.md) - Information about the Supabase implementation

### Technical Documentation
- [Image Analysis Documentation](./docs/image-analysis.md) - Details about the AI-powered image analysis system
- [Testing Documentation](./__tests__/README.md) - Comprehensive guide to the testing infrastructure
- [Database Documentation](./_sql/README.md) - SQL scripts and database management information

### Component Documentation
The project includes documentation for various components in the `docs/components/` directory.

### Database Documentation
Detailed database schemas and relationships can be found in the `docs/dbdocs/` directory.

### Setup Guides
For setup and configuration information, refer to the `docs/setup/` directory.

## Testing

SureSight uses Jest and React Testing Library for comprehensive testing. The test suite includes:

- Unit tests for utilities and services
- Component tests for UI elements
- Integration tests for API endpoints
- End-to-end tests for critical user flows
- Database service tests

To run tests:

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run database tests
npm run test:db
```

For more details about testing, see the [Testing Documentation](./__tests__/README.md).

## Database Management

The project uses Supabase as its database provider. SQL scripts for managing the database schema, functions, and policies are found in the `_sql` directory.

For detailed information on database management, see the [Database Documentation](./_sql/README.md).

## Future Enhancements

The SureSight roadmap includes the following planned improvements:

### Short-term Goals (Next 3 months)
- Enhanced AI model training with larger dataset
- Implement contractor bidding system for repairs
- Add weather data integration to correlate with damage reports
- Develop PDF export functionality for reports
- Improve accessibility features

### Medium-term Goals (3-6 months)
- Mobile application development (iOS and Android)
- Implement real-time chat between homeowners and contractors
- Add historical weather data analysis for damage correlation
- Expand damage detection to additional property areas (gutters, windows)
- Develop API for insurance company integrations

### Long-term Vision (6+ months)
- Machine learning model for predictive damage assessment
- Drone imagery integration for comprehensive property scanning
- AR/VR features for interactive damage visualization
- Marketplace for verified contractors
- International market expansion with localization
- Integration with smart home systems for automated detection

## Contributors

- [Austin Lukowski](https://github.com/Lownickle)
- [Isaiah Jacobsen](https://github.com/J-Isaiah)
- [Samuel Escamilla](https://github.com/sescamilla23)
- [Scott  Faust](https://github.com/DrFaustest)
- [Sebastian Gomez-Duranona](https://github.com/SebasDuranona)
- [Zane Eggleston](https://github.com/zeggleston405)
- [Andrew Heftie](https://github.com/aheftie)

## Data Contributors 
- Papio Exteriors
- Titan Exteriors

## License
This project is licensed under the MIT License.
