import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';

const CreateClassroomPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capacity: 30,
  });

  const createClassroom = useMutation(
    async (data) => {
      const response = await axios.post('/api/classrooms', data);
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success('Classroom created successfully!');
        navigate(`/classrooms/${data._id}`);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create classroom');
      },
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    createClassroom.mutate(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <>
      <Helmet>
        <title>Create Classroom | Coding Platform</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Create New Classroom</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Classroom Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="input mt-1"
                placeholder="Enter classroom name"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                className="input mt-1"
                placeholder="Enter classroom description"
              />
            </div>

            <div>
              <label
                htmlFor="capacity"
                className="block text-sm font-medium text-gray-700"
              >
                Capacity
              </label>
              <input
                type="number"
                id="capacity"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                min="1"
                max="100"
                className="input mt-1"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/classrooms')}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={createClassroom.isLoading}
              >
                {createClassroom.isLoading ? (
                  <>
                    <div className="loading-spinner-sm mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Classroom'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreateClassroomPage;