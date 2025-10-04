# Educational Coding Platform

A comprehensive educational coding platform that provides an interactive learning environment for students to practice programming. The system features a problem repository with categorized challenges, each containing detailed problem statements, input/output specifications, constraints, and multiple test cases including hidden ones.

## Features

### Core Functionality
- **Problem Repository**: Categorized programming challenges with detailed descriptions
- **Interactive Code Editor**: Full-featured editor with syntax highlighting and auto-completion
- **Multi-language Support**: Support for C++, Python, Java, and JavaScript
- **Automated Code Execution**: Compile and execute submitted code against all test cases
- **Real-time Feedback**: Immediate feedback on correctness, performance metrics, and detailed error messages
- **Progress Tracking**: Record submission history, display performance analytics, and suggest personalized learning paths

### Advanced Features
- **Gamification**: Leaderboard system with rankings and achievements
- **Discussion Forum**: Collaborative problem-solving with Q&A threads
- **Classroom Management**: Instructor tools for creating custom problems and monitoring student progress
- **Code Plagiarism Detection**: Advanced algorithms to prevent code plagiarism
- **Responsive Design**: Intuitive interface accessible on both desktop and mobile devices

## Technology Stack

### Backend
- **Node.js** with Express.js for server-side logic
- **MongoDB** with Mongoose for database management
- **JWT** for authentication and authorization
- **Docker-like sandboxing** for secure code execution
- **Socket.io** for real-time features

### Frontend
- **React** with modern hooks and context API
- **Tailwind CSS** for responsive styling
- **Monaco Editor** for the code editing experience
- **React Query** for server state management
- **React Router** for navigation

## Project Structure

```
coding-platform/
├── server/                 # Backend application
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── services/          # Business logic services
│   └── index.js           # Server entry point
├── client/                # Frontend application
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── services/      # API services
│   │   └── utils/         # Utility functions
│   └── package.json
├── package.json           # Root package.json
└── README.md
```

## Installation and Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/educational-coding-platform.git
cd educational-coding-platform
```

### 2. Install Dependencies
You need to install dependencies in three different directories:

```bash
# 1. Install root dependencies (from the project root directory)
npm install

# 2. Install server dependencies (navigate to server directory first)
cd server
npm install

# 3. Install client dependencies (navigate to client directory)
cd ../client
npm install

# 4. Return to root directory (optional, for running the app)
cd ..
```

**Directory Structure:**
```
educational-coding-platform/          ← Run npm install here first
├── package.json                      ← Root package.json
├── server/                           ← Then cd here and run npm install
│   ├── package.json                  ← Server package.json
│   └── .env
└── client/                           ← Then cd here and run npm install
    └── package.json                  ← Client package.json
```

### 3. Environment Configuration
Create a `.env` file in the server directory:

```bash
cd server
cp .env.example .env
```

#### Generate a Secure JWT_SECRET

Before editing your `.env` file, you must generate a secure JWT_SECRET:

```bash
# Generate a secure random secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the generated secret (64-character hexadecimal string) for use in your `.env` file.

For detailed instructions, see [JWT_SECRET_Guide.md](./JWT_SECRET_Guide.md).

Edit the `.env` file with your configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/coding-platform

# JWT Configuration
JWT_SECRET=your-generated-64-character-secret-here
JWT_EXPIRE=30d

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Code Execution Configuration
MAX_EXECUTION_TIME=5000
MAX_MEMORY_LIMIT=262144000
TEMP_DIR=./code_execution/temp
```

**Important**: Replace `your-generated-64-character-secret-here` with the actual secret you generated above. Never use the placeholder value in production.

### 4. Start MongoDB
Make sure MongoDB is running on your system:

```bash
# On macOS with Homebrew
brew services start mongodb-community

# On Windows
net start MongoDB

# On Linux
sudo systemctl start mongod
```

### 5. Run the Application

#### Development Mode
Run both server and client concurrently:

```bash
# From the root directory
npm run dev
```

Or run them separately:

```bash
# Start server (from root directory)
npm run server

# Start client (from root directory)
npm run client
```

#### Production Mode
```bash
# Build the client
npm run build

# Start the server in production mode
NODE_ENV=production npm start
```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password

### Problem Endpoints
- `GET /api/problems` - Get all problems with filtering
- `GET /api/problems/:id` - Get problem by ID
- `POST /api/problems` - Create new problem (instructor/admin only)
- `PUT /api/problems/:id` - Update problem (instructor/admin only)
- `DELETE /api/problems/:id` - Delete problem (instructor/admin only)
- `POST /api/problems/:id/bookmark` - Bookmark/unbookmark problem

### Submission Endpoints
- `POST /api/submissions` - Submit code for a problem
- `GET /api/submissions/:id` - Get submission by ID
- `GET /api/submissions/problem/:problemId` - Get submissions for a problem
- `GET /api/submissions/user/all` - Get all user submissions
- `GET /api/submissions/stats/overview` - Get submission statistics

### Leaderboard Endpoints
- `GET /api/leaderboard` - Get global leaderboard
- `GET /api/leaderboard/institution/:institution` - Get institution leaderboard
- `GET /api/leaderboard/contributors/top` - Get top contributors

### Forum Endpoints
- `GET /api/forum` - Get forum posts
- `GET /api/forum/:id` - Get post by ID
- `POST /api/forum` - Create new post
- `PUT /api/forum/:id` - Update post
- `DELETE /api/forum/:id` - Delete post
- `POST /api/forum/:id/vote` - Vote on post
- `POST /api/forum/:id/reply` - Add reply to post

### Classroom Endpoints
- `GET /api/classrooms` - Get classrooms
- `GET /api/classrooms/:id` - Get classroom by ID
- `POST /api/classrooms` - Create classroom (instructor/admin only)
- `PUT /api/classrooms/:id` - Update classroom
- `DELETE /api/classrooms/:id` - Delete classroom
- `POST /api/classrooms/:id/join` - Join classroom
- `POST /api/classrooms/:id/leave` - Leave classroom

## Code Execution

The platform supports code execution for multiple programming languages with sandboxing:

### Supported Languages
- **C++** (g++ compiler)
- **Python** (Python 3)
- **Java** (OpenJDK)
- **JavaScript** (Node.js)

### Security Features
- Isolated execution environment
- Time and memory limits
- Resource usage monitoring
- Output sanitization

## Testing

### Backend Tests
```bash
cd server
npm test
```

### Frontend Tests
```bash
cd client
npm test
```

## Deployment

### Docker Deployment
```bash
# Build Docker image
docker build -t coding-platform .

# Run container
docker run -p 5000:5000 -e MONGODB_URI=mongodb://host.docker.internal:27017/coding-platform coding-platform
```

### Environment Variables for Production
- `NODE_ENV=production`
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secure JWT secret key
- `CLIENT_URL` - Frontend URL

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please contact support@codingplatform.com or create an issue on GitHub.

## Acknowledgments

- Monaco Editor for the code editing experience
- Tailwind CSS for the beautiful UI
- Express.js and MongoDB for the robust backend
- React for the interactive frontend