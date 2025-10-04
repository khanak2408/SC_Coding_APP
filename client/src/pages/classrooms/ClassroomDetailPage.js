import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';

const ClassroomDetailPage = () => {
  const { id } = useParams();
  const { data: classroom, isLoading, error } = useQuery(['classroom', id], async () => {
    const response = await axios.get(`/api/classrooms/${id}`);
    return response.data;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600">
        Error loading classroom: {error.message}
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{classroom?.name || 'Classroom'} | Coding Platform</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="card">
          <div className="card-header">
            <h1 className="text-2xl font-bold">{classroom?.name}</h1>
            <p className="text-gray-600 mt-2">{classroom?.description}</p>
          </div>

          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Students Section */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Students</h2>
                <div className="space-y-4">
                  {classroom?.students?.map((student) => (
                    <div
                      key={student._id}
                      className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-gray-600">{student.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Problems Section */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Assigned Problems</h2>
                <div className="space-y-4">
                  {classroom?.problems?.map((problem) => (
                    <div
                      key={problem._id}
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                    >
                      <h3 className="font-medium">{problem.title}</h3>
                      <div className="flex items-center mt-2 space-x-4">
                        <span className={`badge badge-${problem.difficulty}`}>
                          {problem.difficulty}
                        </span>
                        <span className="text-sm text-gray-600">
                          Points: {problem.points}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ClassroomDetailPage;