import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';

const ClassroomsPage = () => {
  const { data: classrooms, isLoading, error } = useQuery('classrooms', async () => {
    const response = await axios.get('/api/classrooms');
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
        Error loading classrooms: {error.message}
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Classrooms | Coding Platform</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Classrooms</h1>
          <Link
            to="/classrooms/create"
            className="btn-primary"
          >
            Create Classroom
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classrooms?.map((classroom) => (
            <div key={classroom._id} className="card">
              <div className="card-body">
                <h3 className="text-xl font-semibold mb-2">{classroom.name}</h3>
                <p className="text-gray-600 mb-4">{classroom.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {classroom.students?.length || 0} students
                  </span>
                  <Link
                    to={`/classrooms/${classroom._id}`}
                    className="btn-secondary"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {classrooms?.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">No classrooms found.</p>
            <Link
              to="/classrooms/create"
              className="btn-primary mt-4"
            >
              Create Your First Classroom
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default ClassroomsPage;