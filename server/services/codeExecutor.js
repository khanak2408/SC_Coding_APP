const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class CodeExecutor {
  constructor() {
    this.tempDir = path.join(__dirname, '../../code_execution/temp');
    this.submissionDir = path.join(__dirname, '../../code_execution/submissions');
    this.timeLimit = 5000; // 5 seconds default
    this.memoryLimit = 256 * 1024 * 1024; // 256MB in bytes
  }

  // Initialize directories
  async init() {
    await fs.ensureDir(this.tempDir);
    await fs.ensureDir(this.submissionDir);
  }

  // Execute code and return results
  async execute(submissionId, code, language, testCases, timeLimit = null, memoryLimit = null) {
    const executionId = uuidv4();
    const workDir = path.join(this.tempDir, executionId);
    
    try {
      // Create working directory
      await fs.ensureDir(workDir);
      
      // Set limits for this execution
      const execTimeLimit = timeLimit || this.timeLimit;
      const execMemoryLimit = memoryLimit || this.memoryLimit;
      
      // Prepare files based on language
      const { executableFile, sourceFile, compileCommand, runCommand } = 
        await this.prepareFiles(workDir, code, language);
      
      // Compile if necessary
      if (compileCommand) {
        const compileResult = await this.compile(workDir, compileCommand);
        if (!compileResult.success) {
          return {
            success: false,
            status: 'compilation-error',
            error: compileResult.error,
            compilationTime: compileResult.time
          };
        }
      }
      
      // Run test cases
      const results = [];
      let totalScore = 0;
      let maxScore = 0;
      let totalTime = 0;
      let maxMemory = 0;
      
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        const result = await this.runTestCase(
          workDir, 
          executableFile, 
          runCommand, 
          testCase.input, 
          execTimeLimit, 
          execMemoryLimit,
          i
        );
        
        // Calculate score for this test case
        const testCaseScore = result.passed ? testCase.points || 10 : 0;
        totalScore += testCaseScore;
        maxScore += testCase.points || 10;
        
        // Track max time and memory
        totalTime = Math.max(totalTime, result.time);
        maxMemory = Math.max(maxMemory, result.memory);
        
        results.push({
          testCaseId: testCase._id || i,
          passed: result.passed,
          timeTaken: result.time,
          memoryUsed: result.memory,
          input: testCase.input,
          expectedOutput: testCase.output,
          actualOutput: result.output,
          error: result.error,
          score: testCaseScore
        });
      }
      
      // Determine overall status
      let status = 'accepted';
      if (totalScore === 0) {
        status = 'wrong-answer';
      } else if (totalScore < maxScore) {
        status = 'partial-correct';
      }
      
      // Check for specific errors in results
      for (const result of results) {
        if (result.error) {
          if (result.error.includes('Time limit exceeded')) {
            status = 'time-limit-exceeded';
            break;
          } else if (result.error.includes('Memory limit exceeded')) {
            status = 'memory-limit-exceeded';
            break;
          } else if (result.error.includes('Runtime error')) {
            status = 'runtime-error';
            break;
          }
        }
      }
      
      return {
        success: true,
        status,
        score: totalScore,
        maxScore,
        timeTaken: totalTime,
        memoryUsed: maxMemory,
        testCasesPassed: results.filter(r => r.passed).length,
        totalTestCases: testCases.length,
        testCaseResults: results
      };
      
    } catch (error) {
      console.error('Execution error:', error);
      return {
        success: false,
        status: 'runtime-error',
        error: error.message
      };
    } finally {
      // Clean up temporary directory
      try {
        await fs.remove(workDir);
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
  }

  // Prepare files based on language
  async prepareFiles(workDir, code, language) {
    let sourceFile, executableFile, compileCommand, runCommand;
    
    switch (language) {
      case 'cpp':
        sourceFile = path.join(workDir, 'solution.cpp');
        executableFile = path.join(workDir, 'solution');
        await fs.writeFile(sourceFile, code);
        compileCommand = `g++ -std=c++17 -O2 -Wall ${sourceFile} -o ${executableFile}`;
        runCommand = executableFile;
        break;
        
      case 'python':
        sourceFile = path.join(workDir, 'solution.py');
        executableFile = sourceFile;
        await fs.writeFile(sourceFile, code);
        compileCommand = null; // Python doesn't need compilation
        runCommand = `python3 ${sourceFile}`;
        break;
        
      case 'java':
        sourceFile = path.join(workDir, 'Solution.java');
        executableFile = path.join(workDir, 'Solution');
        await fs.writeFile(sourceFile, code);
        compileCommand = `javac ${sourceFile}`;
        runCommand = `java -cp ${workDir} Solution`;
        break;
        
      case 'javascript':
        sourceFile = path.join(workDir, 'solution.js');
        executableFile = sourceFile;
        await fs.writeFile(sourceFile, code);
        compileCommand = null; // JavaScript doesn't need compilation
        runCommand = `node ${sourceFile}`;
        break;
        
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
    
    return { sourceFile, executableFile, compileCommand, runCommand };
  }

  // Compile code if needed
  async compile(workDir, compileCommand) {
    try {
      const startTime = Date.now();
      const { stderr } = await execAsync(compileCommand, {
        cwd: workDir,
        timeout: 10000 // 10 seconds compilation timeout
      });
      const compilationTime = Date.now() - startTime;
      
      if (stderr) {
        return {
          success: false,
          error: stderr,
          time: compilationTime
        };
      }
      
      return {
        success: true,
        time: compilationTime
      };
    } catch (error) {
      return {
        success: false,
        error: error.stderr || error.message,
        time: 0
      };
    }
  }

  // Run a single test case
  async runTestCase(workDir, executableFile, runCommand, input, timeLimit, memoryLimit, testCaseIndex) {
    const inputFile = path.join(workDir, `input_${testCaseIndex}.txt`);
    const outputFile = path.join(workDir, `output_${testCaseIndex}.txt`);
    const errorFile = path.join(workDir, `error_${testCaseIndex}.txt`);
    
    try {
      // Write input to file
      await fs.writeFile(inputFile, input);
      
      // Prepare command with resource limits
      const command = this.prepareExecutionCommand(
        runCommand, 
        inputFile, 
        outputFile, 
        errorFile, 
        timeLimit, 
        memoryLimit
      );
      
      // Execute with timeout
      const startTime = Date.now();
      const { stdout, stderr } = await execAsync(command, {
        cwd: workDir,
        timeout: timeLimit + 1000 // Add 1 second buffer
      });
      const executionTime = Date.now() - startTime;
      
      // Read output
      const output = await fs.readFile(outputFile, 'utf8');
      
      // Read error if any
      let errorOutput = '';
      try {
        errorOutput = await fs.readFile(errorFile, 'utf8');
      } catch (error) {
        // Error file might not exist
      }
      
      // Normalize output for comparison
      const normalizedOutput = this.normalizeOutput(output);
      const normalizedExpectedOutput = this.normalizeOutput(stdout || '');
      
      // Check if output matches expected
      const passed = normalizedOutput === normalizedExpectedOutput;
      
      return {
        passed,
        time: executionTime,
        memory: 0, // Memory tracking would require additional tools
        output: normalizedOutput,
        error: errorOutput || stderr
      };
      
    } catch (error) {
      let errorMessage = 'Runtime error';
      
      if (error.signal === 'SIGTERM' || error.signal === 'SIGKILL') {
        errorMessage = 'Time limit exceeded';
      } else if (error.code === 134) {
        errorMessage = 'Memory limit exceeded';
      } else if (error.stderr) {
        errorMessage = `Runtime error: ${error.stderr}`;
      }
      
      return {
        passed: false,
        time: timeLimit,
        memory: 0,
        output: '',
        error: errorMessage
      };
    } finally {
      // Clean up test case files
      try {
        await fs.remove(inputFile);
        await fs.remove(outputFile);
        await fs.remove(errorFile);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  // Prepare execution command with resource limits
  prepareExecutionCommand(runCommand, inputFile, outputFile, errorFile, timeLimit, memoryLimit) {
    // For Windows, we'll use a simpler approach without ulimit
    if (process.platform === 'win32') {
      return `${runCommand} < ${inputFile} > ${outputFile} 2> ${errorFile}`;
    }
    
    // For Unix-like systems, we can use timeout and ulimit
    return `timeout ${timeLimit / 1000}s bash -c "ulimit -v ${memoryLimit / 1024}; ${runCommand} < ${inputFile} > ${outputFile} 2> ${errorFile}"`;
  }

  // Normalize output for comparison
  normalizeOutput(output) {
    return output
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')
      .trim();
  }
}

module.exports = new CodeExecutor();