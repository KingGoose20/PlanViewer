// Initialize an array to store the plans (can be preloaded here)
let plans = [
  {
    "name": "Unranked",
    "weeks": [
      {
        "name": "Week 1",
        "workouts": [
          {
            "name": "Workout A",
            "exercises": [
              {
                "name": "Exercise A",
                "sets": "2",
                "reps": "3",
                "distance": "10m",
                "time": "10 sec",
                "restTime": "30s",
                "youtubeLink": "x"
              },
              {
                "name": "Exercise B",
                "sets": "2",
                "reps": "3",
                "distance": "10m",
                "time": "10 sec",
                "restTime": "30s",
                "youtubeLink": "x"
              },
              {
                "name": "Exercise C",
                "sets": "2",
                "reps": "3",
                "distance": "10m",
                "time": "10 sec",
                "restTime": "30s",
                "youtubeLink": "x"
              },
              {
                "name": "Exercise D",
                "sets": "2",
                "reps": "3",
                "distance": "10m",
                "time": "10 sec",
                "restTime": "30s",
                "youtubeLink": "x"
              }
            ]
          }
        ]
      }
    ]
  },
];

let exercises = [
  {
    "name": "Exercise A",
    "levels": [
      {
        "level": 1,
        "link": "youtube.com"
      }
    ]

  },
]


// Preload data if available
function preloadPlans() {
  // If there’s preloaded data, set it here. Example:
  // plans = [ { name: "Preloaded Plan", weeks: [...] }, ... ];

  // Render the preloaded data
  renderPlans();
}

// Function to render all plans
function renderPlans() {
  const plansContainer = document.getElementById('plansContainer');
  plansContainer.innerHTML = '';  // Clear the container

  plans.forEach((plan, planIndex) => {
    const planDiv = document.createElement('div');
    planDiv.classList.add('plan');
    planDiv.innerHTML = `
      <h2>${plan.name}</h2>
      <input type="text" placeholder="Week Name" id="weekName${planIndex}">
      <button onclick="addWeek(${planIndex})">Add Week</button>
      <div id="weeksContainer${planIndex}"></div>
    `;

    // Render weeks for this plan
    plan.weeks.forEach((week, weekIndex) => {
      const weekDiv = document.createElement('div');
      weekDiv.classList.add('week');
      weekDiv.innerHTML = `
        <h3>${week.name}</h3>
        <input type="text" placeholder="Workout Name" id="workoutName${planIndex}${weekIndex}">
        <button onclick="addWorkout(${planIndex}, ${weekIndex})">Add Workout</button>
        <div id="workoutsContainer${planIndex}${weekIndex}"></div>
      `;

      // Render workouts for this week
      week.workouts.forEach((workout, workoutIndex) => {
        const workoutDiv = document.createElement('div');
        workoutDiv.classList.add('workout');
        workoutDiv.innerHTML = `
          <h4>${workout.name}</h4>
          <input type="text" placeholder="Exercise Name" id="exerciseName${planIndex}${weekIndex}${workoutIndex}">
          <input type="number" placeholder="Sets" id="sets${planIndex}${weekIndex}${workoutIndex}">
          <input type="number" placeholder="Reps" id="reps${planIndex}${weekIndex}${workoutIndex}">
          <input type="text" placeholder="Distance" id="distance${planIndex}${weekIndex}${workoutIndex}">
          <input type="text" placeholder="Time" id="time${planIndex}${weekIndex}${workoutIndex}">
          <input type="text" placeholder="Rest Time" id="restTime${planIndex}${weekIndex}${workoutIndex}">
          <input type="text" placeholder="YouTube Link" id="youtubeLink${planIndex}${weekIndex}${workoutIndex}">
          <button onclick="addExercise(${planIndex}, ${weekIndex}, ${workoutIndex})">Add Exercise</button>
          <div id="exercisesContainer${planIndex}${weekIndex}${workoutIndex}"></div>
        `;

        // Render exercises for this workout
        workout.exercises.forEach(exercise => {
          const exerciseDiv = document.createElement('div');
          exerciseDiv.classList.add('exercise');
          exerciseDiv.innerHTML = `
            <strong>${exercise.name}</strong>
            <p>Sets: ${exercise.sets}</p>
            <p>Reps: ${exercise.reps}</p>
            <p>Distance: ${exercise.distance || '-'}</p>
            <p>Time: ${exercise.time}</p>
            <p>Rest Time: ${exercise.restTime}</p>
            <a href="${exercise.youtubeLink}" target="_blank">Watch Exercise</a>
          `;

          workoutDiv.querySelector(`#exercisesContainer${planIndex}${weekIndex}${workoutIndex}`).appendChild(exerciseDiv);
        });

        weekDiv.querySelector(`#workoutsContainer${planIndex}${weekIndex}`).appendChild(workoutDiv);
      });

      planDiv.querySelector(`#weeksContainer${planIndex}`).appendChild(weekDiv);
    });

    plansContainer.appendChild(planDiv);
  });
}

// Function to add a new plan
function addPlan() {
  const planName = document.getElementById('planName').value;
  if (planName.trim()) {
    plans.push({
      name: planName,
      weeks: []
    });
    renderPlans();
  }
}

// Function to add a new week to a plan
function addWeek(planIndex) {
  const weekName = document.getElementById(`weekName${planIndex}`).value;
  if (weekName.trim()) {
    plans[planIndex].weeks.push({
      name: weekName,
      workouts: []
    });
    renderPlans();
  }
}

// Function to add a new workout to a week
function addWorkout(planIndex, weekIndex) {
  const workoutName = document.getElementById(`workoutName${planIndex}${weekIndex}`).value;
  if (workoutName.trim()) {
    plans[planIndex].weeks[weekIndex].workouts.push({
      name: workoutName,
      exercises: []
    });
    renderPlans();
  }
}

// Function to add a new exercise to a workout
function addExercise(planIndex, weekIndex, workoutIndex) {
  const exerciseName = document.getElementById(`exerciseName${planIndex}${weekIndex}${workoutIndex}`).value;
  const sets = document.getElementById(`sets${planIndex}${weekIndex}${workoutIndex}`).value;
  const reps = document.getElementById(`reps${planIndex}${weekIndex}${workoutIndex}`).value;
  const distance = document.getElementById(`distance${planIndex}${weekIndex}${workoutIndex}`).value;
  const time = document.getElementById(`time${planIndex}${weekIndex}${workoutIndex}`).value;
  const restTime = document.getElementById(`restTime${planIndex}${weekIndex}${workoutIndex}`).value;
  const youtubeLink = document.getElementById(`youtubeLink${planIndex}${weekIndex}${workoutIndex}`).value;

  if (exerciseName.trim()) {
    plans[planIndex].weeks[weekIndex].workouts[workoutIndex].exercises.push({
      name: exerciseName,
      sets: sets || '-',
      reps: reps || '-',
      distance: distance || '-',
      time: time || '-',
      restTime: restTime || '-',
      youtubeLink: youtubeLink || '#'
    });
    renderPlans();
  }
}

// Function to export the plans as JSON for saving
function exportPlans() {
  const dataStr = JSON.stringify(plans, null, 2); // Pretty-print JSON with indentation
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'workout_plans.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Function to copy the plans as JavaScript array (so you can paste it directly into the script)
function exportPlansAsJS() {
  const dataStr = JSON.stringify(plans, null, 2)
    .replace(/"([^"]+)":/g, '$1:')   // Remove quotes around keys
    .replace(/"/g, "'");              // Change quotes to single quotes for JS object notation
  const jsCode = `let plans = ${dataStr};`;

  const pre = document.createElement('pre');
  pre.textContent = jsCode;
  document.body.appendChild(pre);
}

// Call this on page load to preload plans
preloadPlans();
