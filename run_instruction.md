# How to Run the Educational Coding Platform

This guide provides step-by-step instructions to set up and run the Educational Coding Platform on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v16 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **MongoDB** (v4.4 or higher)
   - Download from: https://www.mongodb.com/try/download/community
   - Or install using package manager:
     - macOS: `brew install mongodb-community`
     - Windows: Download and run the installer
     - Ubuntu: `sudo apt-get install mongodb`

3. **Git**
   - Download from: https://git-scm.com/
   - Verify installation: `git --version`

## Installation Steps

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

### 3. Set Up Environment Variables

```bash
# Copy the example environment file
cd server
cp .env.example .env

# Edit the .env file with your preferred text editor
# For Windows: notepad .env
# For macOS/Linux: nano .env or vim .env
```

#### IMPORTANT: Generate a Secure JWT_SECRET

Before updating your `.env` file, you must generate a secure JWT_SECRET:

```bash
# Generate a secure random secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the generated secret (64-character hexadecimal string) and use it in your `.env` file.

For detailed instructions, see [JWT_SECRET_Guide.md](./JWT_SECRET_Guide.md).

Update the following values in your `.env` file:

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
```

**Note**: Replace `your-generated-64-character-secret-here` with the actual secret you generated above.

### 4. Start MongoDB

#### On macOS:
```bash
brew services start mongodb-community
```

#### On Windows:
```bash
net start MongoDB
```

#### On Linux:
```bash
sudo systemctl start mongod
```

#### Verify MongoDB is running:
```bash
mongosh
# Or for older versions: mongo
```

### 5. Run the Application

You have two options to run the application:

#### Option 1: Run Both Server and Client Concurrently (Recommended)

```bash
# From the root directory
npm run dev
```

This will start both the backend server (on port 5000) and frontend client (on port 3000) simultaneously.

#### Option 2: Run Server and Client Separately

Open two terminal windows:

**Terminal 1 - Start Server:**
```bash
npm run server
```

**Terminal 2 - Start Client:**
```bash
npm run client
```

### 6. Access the Application

Once both servers are running, you can access:

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

## Troubleshooting

### Common Issues and Solutions

#### 1. Port Already in Use

If you get an error that port 5000 or 3000 is already in use:

```bash
# Find the process using the port
# On Windows:
netstat -ano | findstr :5000
# On macOS/Linux:
lsof -i :5000

# Kill the process (replace PID with the actual process ID)
# On Windows:
taskkill /PID <PID> /F
# On macOS/Linux:
kill -9 <PID>
```

Or change the port in your `.env` file:

```env
PORT=5001  # Use a different port
```

#### 2. MongoDB Connection Error

If you can't connect to MongoDB:

```bash
# Check if MongoDB is running
brew services list | grep mongodb  # macOS
systemctl status mongod             # Linux

# Start MongoDB if not running
brew services start mongodb-community  # macOS
sudo systemctl start mongod             # Linux
```

#### 3. Module Not Found Error

If you get "module not found" errors:

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install
```

#### 4. Permission Denied Error

If you get permission errors:

```bash
# On macOS/Linux, you might need to use sudo for global packages
sudo npm install -g <package-name>

# Or change npm's default directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Development Tips

#### 1. Hot Reloading

- The frontend supports hot reloading - changes to React components will automatically refresh the browser
- The backend server will automatically restart when you make changes to server files

#### 2. Debugging

- For frontend debugging, use browser developer tools (F12)
- For backend debugging, add `console.log()` statements or use a debugger like VS Code's built-in debugger

#### 3. Database Management

- You can use MongoDB Compass (GUI) or mongosh (CLI) to view and manage the database
- Default database name: `coding-platform`
- Collections: users, problems, submissions, classrooms, posts, achievements

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in your `.env` file
2. Build the frontend: `npm run build`
3. Start the server: `npm start`
4. Consider using a process manager like PM2: `pm2 start server/index.js`

## Additional Resources

- MongoDB Documentation: https://docs.mongodb.com/
- Express.js Documentation: https://expressjs.com/
- React Documentation: https://reactjs.org/
- Tailwind CSS Documentation: https://tailwindcss.com/

## Support

If you encounter any issues not covered in this guide:

1. Check the console output for error messages
2. Review the logs in the terminal
3. Ensure all prerequisites are properly installed
4. Verify your environment variables are correctly set

For additional support, create an issue on the GitHub repository.