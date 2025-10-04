import React from 'react';

const ProfilePage = () => {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Profile Page
          </h1>
          <p className="text-gray-600">
            View and edit your profile here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;