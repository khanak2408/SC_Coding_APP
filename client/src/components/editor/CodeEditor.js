import React from 'react';
import Editor from '@monaco-editor/react';

const CodeEditor = ({ language, value, onChange, height = '400px', readOnly = false }) => {
  const handleEditorChange = (value) => {
    onChange(value);
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={handleEditorChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          readOnly,
          tabSize: 2,
          insertSpaces: true,
          wordWrap: 'on',
        }}
      />
    </div>
  );
};

export default CodeEditor;