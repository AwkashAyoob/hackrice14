import { useState } from 'react';
import AssignmentForm from './components/AssignmentForm';
import UserInput from './components/UserInput';
import CalendarView from './components/CalendarView';
import { loadGoogleCalendar, fetchCalendarEvents, addEventToCalendar } from './api/GoogleCalendarAPI';
import './App.css';

const App = () => {
  const [assignments, setAssignments] = useState([]);
  const [events, setEvents] = useState([]);
  const [userRoutine, setUserRoutine] = useState(null); // For meal times and sleep/wake times
  const [isGapiReady, setIsGapiReady] = useState(false); // To track if Google Calendar is ready
  const [isRoutineSet, setIsRoutineSet] = useState(false); // To track if the routine is set
  const [popupTriggered, setPopupTriggered] = useState(false); // Ensure popup is triggered only once
  

  // Function to handle Google Sign-In, triggered by the button click
  const handleGoogleSignIn = () => {
    if (!popupTriggered) {  // Ensure popup is triggered only once
      console.log("Attempting to load Google Calendar...");
      setPopupTriggered(true);  // Set flag to prevent multiple popups
      loadGoogleCalendar()
        .then(() => {
          console.log('Google API client initialized successfully');
          setIsGapiReady(true); // Google API is ready
          return fetchCalendarEvents();
        })
        .then(fetchedEvents => {
          console.log('Fetched events:', fetchedEvents);  // Log the fetched events
          if (fetchedEvents.length === 0) {
            console.log("No events found.");
          }
          const formattedEvents = fetchedEvents.map(event => ({
            title: event.summary,
            start: new Date(event.start.dateTime || event.start.date),
            end: new Date(event.end.dateTime || event.end.date),
          }));
          setEvents(formattedEvents); // Set fetched events
        })
        .catch(error => {
          console.error('Error loading Google Calendar API or fetching events:', error);
        });
    } else {
      console.log('Google Calendar API is already loaded or popup already triggered.');
    }
  };

  // Handle routine submission
  const handleRoutineSubmit = (routine) => {
    setUserRoutine(routine);
    setIsRoutineSet(true); // Proceed to show the calendar and assignments UI
  };

  // Function to handle assignment submission
  const handleAssignmentSubmit = async (assignment) => {
    setAssignments([...assignments, assignment]);
    await scheduleAssignment(assignment);
  };

  // Function to schedule assignment
  const scheduleAssignment = async (assignment) => {
    console.log('Scheduling assignment:', assignment);
  
    // Fetch existing events to consider when scheduling
    const existingEvents = await fetchCalendarEvents();
  
    // Get user's routine
    const { sleepTime, wakeTime, mealTimes } = userRoutine;
  
    // Calculate due date and time
    const dueDateTime = new Date(`${assignment.dueDate}T${assignment.dueTime}`);
  
    // Slot duration in minutes (adjust as needed)
    const slotDurationMinutes = 15; // Use 15-minute increments for flexibility
    const slotDuration = slotDurationMinutes * 60 * 1000;
  
    // Calculate total estimated time in minutes
    const estimatedTimeMinutes = assignment.estimatedTime * 60;
  
    // Calculate available time slots
    const availableSlots = calculateAvailableTimeSlots(
      existingEvents,
      sleepTime,
      wakeTime,
      mealTimes,
      dueDateTime,
      slotDuration
    );
  
    // Allocate time slots based on assignment type
    const scheduledSlots = allocateTimeSlots(availableSlots, estimatedTimeMinutes, assignment);
  
    if (scheduledSlots.length === 0) {
      console.warn('No available time slots to schedule the assignment.');
      return;
    }
  
    // Merge consecutive scheduled slots into longer slots
    const mergedSlots = mergeConsecutiveSlots(scheduledSlots);
  
    // Create events in Google Calendar
    for (const slot of mergedSlots) {
      const event = {
        summary: `Work on: ${assignment.assignment} (${assignment.assignmentType})`,
        description: `Estimated time: ${assignment.estimatedTime} hours`,
        start: { dateTime: slot.start.toISOString() },
        end: { dateTime: slot.end.toISOString() },
      };
      await addEventToCalendar(event);
    }
  
    // Refresh events in the calendar view
    const fetchedEvents = await fetchCalendarEvents();
    const formattedEvents = fetchedEvents.map(event => ({
      title: event.summary,
      start: new Date(event.start.dateTime || event.start.date),
      end: new Date(event.end.dateTime || event.end.date),
    }));
    setEvents(formattedEvents);
  };

  // Function to merge consecutive time slots into longer slots
  function mergeConsecutiveSlots(scheduledSlots) {
    if (scheduledSlots.length === 0) return [];

    // Sort the slots by start time
    scheduledSlots.sort((a, b) => a.start - b.start);

    const mergedSlots = [];
    let currentSlot = { ...scheduledSlots[0] };

    for (let i = 1; i < scheduledSlots.length; i++) {
      const nextSlot = scheduledSlots[i];
      // If the next slot starts exactly when the current slot ends, merge them
      if (nextSlot.start.getTime() === currentSlot.end.getTime()) {
        currentSlot.end = nextSlot.end;
      } else {
        mergedSlots.push(currentSlot);
        currentSlot = { ...nextSlot };
      }
    }

    // Add the last slot
    mergedSlots.push(currentSlot);

    return mergedSlots;
  }

  // Function to round up a date to the next quarter hour
  function roundUpToNextQuarterHour(date) {
    const newDate = new Date(date);
    const minutes = newDate.getMinutes();
    const remainder = minutes % 15;
    if (remainder !== 0) {
      newDate.setMinutes(minutes + (15 - remainder));
    }
    newDate.setSeconds(0, 0);
    return newDate;
  }

  // Function to calculate available time slots
  const calculateAvailableTimeSlots = (existingEvents, sleepTime, wakeTime, mealTimes, dueDateTime, slotDuration) => {
    const availableSlots = [];
    const now = new Date();
    let currentDate = new Date(now.toDateString()); // Start from today
  
    while (currentDate <= dueDateTime) {
      // Get the day's start and end based on sleep and wake times
      const dayStart = new Date(currentDate);
      const [wakeHours, wakeMinutes] = wakeTime.split(':').map(Number);
      dayStart.setHours(wakeHours, wakeMinutes, 0, 0);
  
      let dayEnd = new Date(currentDate); // Changed from const to let
      const [sleepHours, sleepMinutes] = sleepTime.split(':').map(Number);
      dayEnd.setHours(sleepHours, sleepMinutes, 0, 0);
  
      // Adjust for cases where sleep time is past midnight
      if (dayEnd <= dayStart) {
        dayEnd.setDate(dayEnd.getDate() + 1);
      }
  
      // If it's the due date, adjust dayEnd to be the earlier of sleep time and assignment due time
      if (currentDate.toDateString() === dueDateTime.toDateString()) {
        if (dueDateTime < dayEnd) {
          dayEnd = dueDateTime;
        }
      }
  
      // Initialize time pointer and round up to next quarter hour
      let timePointer = new Date(Math.max(dayStart, now)); // Ensure we start from the current time if applicable
      timePointer = roundUpToNextQuarterHour(timePointer);
  
      // Exclude meal times
      const mealTimeIntervals = mealTimes.map(time => {
        const [mealHours, mealMinutes] = time.split(':').map(Number);
        const mealStart = new Date(currentDate);
        mealStart.setHours(mealHours, mealMinutes, 0, 0);
        const mealEnd = new Date(mealStart.getTime() + 60 * 60 * 1000); // Assume 1 hour for meals
        return { start: mealStart, end: mealEnd };
      });
  
      // Build the day's schedule
      while (timePointer < dayEnd) {
        const slotStart = new Date(timePointer);
        const slotEnd = new Date(slotStart.getTime() + slotDuration);
  
        // Check if slot exceeds dayEnd
        if (slotEnd > dayEnd) {
          break;
        }
  
        // Check for conflicts with existing events (including 10-minute buffer)
        const hasConflict = existingEvents.some(event => {
          const eventStart = new Date(event.start.dateTime || event.start.date);
          const eventEnd = new Date(event.end.dateTime || event.end.date);
          
          // Add 10-minute buffer before and after the event
          const bufferStart = new Date(eventStart.getTime() - 10 * 60 * 1000);
          const bufferEnd = new Date(eventEnd.getTime() + 10 * 60 * 1000);
  
          return (slotStart < bufferEnd) && (slotEnd > bufferStart);
        });
  
        // Check for conflicts with meal times
        const inMealTime = mealTimeIntervals.some(meal => {
          return (slotStart < meal.end) && (slotEnd > meal.start);
        });
  
        if (!hasConflict && !inMealTime) {
          availableSlots.push({ start: new Date(slotStart), end: new Date(slotEnd) });
        }
  
        // Move to next slot
        timePointer = new Date(slotEnd.getTime());
      }
  
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  
    return availableSlots;
  };

  // Function to allocate time slots
  const allocateTimeSlots = (availableSlots, totalTimeNeeded, assignment) => {
    const scheduledSlots = [];

    // Sort available slots by start time
    availableSlots.sort((a, b) => a.start - b.start);

    const now = new Date();
    const dueDate = new Date(`${assignment.dueDate}T${assignment.dueTime}`);
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    // Determine the allocation strategy based on assignment type
    let slotsByDay = {};

    if (assignment.assignmentType === 'test') {
      // Linear increase as due date approaches
      const daysToSchedule = Math.min(daysUntilDue, Math.ceil(totalTimeNeeded / 60));
      // Build a weight for each day
      let totalWeight = 0;
      const weights = [];
      for (let i = 0; i < daysToSchedule; i++) {
        const weight = i + 1;
        weights.push(weight);
        totalWeight += weight;
      }
      // Allocate time per day based on weights
      for (let i = 0; i < daysToSchedule; i++) {
        const date = new Date();
        date.setDate(now.getDate() + (daysUntilDue - daysToSchedule + i));
        const dayKey = date.toDateString();
        const timeForDay = (weights[i] / totalWeight) * totalTimeNeeded;
        slotsByDay[dayKey] = (slotsByDay[dayKey] || 0) + timeForDay;
      }
    } else if (assignment.assignmentType === 'project') {
      // Spread evenly across days
      const daysToSchedule = daysUntilDue;
      const timePerDay = totalTimeNeeded / daysToSchedule;
      for (let i = 0; i < daysToSchedule; i++) {
        const date = new Date();
        date.setDate(now.getDate() + i);
        const dayKey = date.toDateString();
        slotsByDay[dayKey] = timePerDay;
      }
    } else if (assignment.assignmentType === 'homework') {
      // Allocate more time closer to due date
      const daysToSchedule = Math.min(daysUntilDue, 2); // Preferably the last two days
      const timeAllocation = [0.66, 0.34]; // Allocate 66% of time the day before, 34% on due date
      for (let i = daysUntilDue - daysToSchedule; i < daysUntilDue; i++) {
        const date = new Date();
        date.setDate(now.getDate() + i);
        const dayKey = date.toDateString();
        const allocationIndex = i - (daysUntilDue - daysToSchedule);
        const timeForDay = timeAllocation[allocationIndex] * totalTimeNeeded;
        slotsByDay[dayKey] = (slotsByDay[dayKey] || 0) + timeForDay;
      }
    } else {
      // Default to evenly spread if assignment type is unknown
      const daysToSchedule = daysUntilDue;
      const timePerDay = totalTimeNeeded / daysToSchedule;
      for (let i = 0; i < daysToSchedule; i++) {
        const date = new Date();
        date.setDate(now.getDate() + i);
        const dayKey = date.toDateString();
        slotsByDay[dayKey] = timePerDay;
      }
    }

    // Now, allocate slots based on slotsByDay
    let timeRemaining = totalTimeNeeded;

    for (const dayKey in slotsByDay) {
      if (timeRemaining <= 0) break;

      const daySlots = availableSlots.filter(slot => slot.start.toDateString() === dayKey);

      // Prefer back-to-back slots
      const sequences = groupConsecutiveSlots(daySlots);

      // Allocate time for the day
      let timeForDay = slotsByDay[dayKey];
      for (const sequence of sequences) {
        if (timeForDay <= 0) break;
        for (const slot of sequence) {
          if (timeForDay <= 0) break;
          const slotDurationMinutes = (slot.end - slot.start) / (1000 * 60);
          const timeToAllocate = Math.min(slotDurationMinutes, timeForDay);
          const allocatedSlot = {
            start: slot.start,
            end: new Date(slot.start.getTime() + timeToAllocate * 60 * 1000),
          };
          scheduledSlots.push(allocatedSlot);
          timeForDay -= timeToAllocate;
          timeRemaining -= timeToAllocate;
          if (timeForDay <= 0 || timeRemaining <= 0) break;
        }
      }
    }

    return scheduledSlots;
  };

  // Helper function to group slots into sequences of consecutive slots
  function groupConsecutiveSlots(slots) {
    slots.sort((a, b) => a.start - b.start);
    const sequences = [];
    let currentSequence = [];

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (currentSequence.length === 0) {
        currentSequence.push(slot);
      } else {
        const previousSlot = currentSequence[currentSequence.length - 1];
        if (slot.start.getTime() === previousSlot.end.getTime()) {
          currentSequence.push(slot);
        } else {
          sequences.push(currentSequence);
          currentSequence = [slot];
        }
      }
    }

    if (currentSequence.length > 0) {
      sequences.push(currentSequence);
    }

    // Sort sequences by length (longest first)
    sequences.sort((a, b) => b.length - a.length);

    return sequences;
  }

  return (
    <div className="App">
      <img src={"/white_schedulize_bg.png"} alt="App Logo" className="app-logo" />

      {/* Step 1: Display sign-in button to trigger Google OAuth */}
      {!isGapiReady && (
        <div>
          <p>Click below to sign in with Google and load your calendar:</p>
          <button onClick={handleGoogleSignIn} disabled={isGapiReady}>
            {isGapiReady ? 'Google Calendar Loaded' : 'Sign in with Google'}
          </button>
        </div>
      )}

      {/* Step 2: Prompt for sleep/wake and meal times after sign-in */}
      {isGapiReady && !isRoutineSet && (
        <div>
          <h2>Please provide your sleep/wake and meal times</h2>
          <UserInput onSubmit={handleRoutineSubmit} />
        </div>
      )}

      {/* Step 3: Show the calendar and assignment form once routine is set */}
      {isRoutineSet && (
        <div>
          <AssignmentForm onSubmit={handleAssignmentSubmit} />
          <CalendarView events={events} />
          <div>
            <h2>Submitted Assignments:</h2>
            <ul>
              {assignments.map((assignment, index) => (
                <li key={index}>
                  {assignment.assignment} - {assignment.assignmentType} | Due: {assignment.dueDate} {assignment.dueTime} |
                  Estimated Time: {assignment.estimatedTime}h | Actual Time: {assignment.actualTime || 'Pending'}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;