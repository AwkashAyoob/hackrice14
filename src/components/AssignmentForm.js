import { useState } from 'react';

const AssignmentForm = ({ onSubmit }) => {
  const [assignment, setAssignment] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('23:59');  // Default time set to 11:59 PM
  const [estimatedTime, setEstimatedTime] = useState('');
  const [actualTime, setActualTime] = useState('');
  const [assignmentType, setAssignmentType] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ 
      assignment, 
      dueDate, 
      dueTime,   // Include dueTime in the submission
      estimatedTime, 
      actualTime, 
      assignmentType 
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        placeholder="Assignment" 
        value={assignment} 
        onChange={(e) => setAssignment(e.target.value)} 
      />
      <select value={assignmentType} onChange={(e) => setAssignmentType(e.target.value)}>
        <option value="" disabled>Select Type</option>
        <option value="test">Test</option>
        <option value="homework">Homework</option>
        <option value="project">Project</option>
      </select>
      <input 
        type="date" 
        value={dueDate} 
        onChange={(e) => setDueDate(e.target.value)} 
      />
      <input 
        type="time" 
        value={dueTime} 
        onChange={(e) => setDueTime(e.target.value)}  // Add time input for due date
      />
      <input 
        type="number" 
        placeholder="Estimated Time (hours)" 
        value={estimatedTime} 
        onChange={(e) => setEstimatedTime(e.target.value)} 
      />
      <input 
        type="number" 
        placeholder="Actual Time (hours)" 
        value={actualTime} 
        onChange={(e) => setActualTime(e.target.value)} 
      />
      <button type="submit">Add Assignment</button>
    </form>
  );
};

export default AssignmentForm;