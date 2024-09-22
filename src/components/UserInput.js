import { useState } from 'react';

const UserInput = ({ onSubmit }) => {
  const [sleepTime, setSleepTime] = useState('');
  const [wakeTime, setWakeTime] = useState('');
  const [mealTimes, setMealTimes] = useState(['']); // Start with one meal time input

  const handleMealTimeChange = (index, value) => {
    const newMealTimes = [...mealTimes];
    newMealTimes[index] = value;
    setMealTimes(newMealTimes);
  };

  const addMealTime = () => {
    setMealTimes([...mealTimes, '']);
  };

  const removeMealTime = (index) => {
    const newMealTimes = mealTimes.filter((_, i) => i !== index);
    setMealTimes(newMealTimes);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Filter out empty meal times
    const filteredMealTimes = mealTimes.filter(time => time !== '');
    onSubmit({ sleepTime, wakeTime, mealTimes: filteredMealTimes });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Sleep Time:</label>
        <input
          type="time"
          value={sleepTime}
          onChange={(e) => setSleepTime(e.target.value)}
        />
      </div>
      <div>
        <label>Wake Time:</label>
        <input
          type="time"
          value={wakeTime}
          onChange={(e) => setWakeTime(e.target.value)}
        />
      </div>
      <div>
        <label>Meal Times:</label>
        {mealTimes.map((time, index) => (
          <div key={index}>
            <input
              type="time"
              value={time}
              onChange={(e) => handleMealTimeChange(index, e.target.value)}
            />
            <button type="button" onClick={() => removeMealTime(index)}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={addMealTime}>
          Add Meal Time
        </button>
      </div>
      <button type="submit">Submit Routine</button>
    </form>
  );
};

export default UserInput;
