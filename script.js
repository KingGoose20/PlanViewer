// Initialize an array to store the newPlans (can be preloaded here)
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
                "levels" : []
              },
              {
                "name": "Exercise B",
                "sets": "2",
                "reps": "3",
                "distance": "10m",
                "time": "10 sec",
                "restTime": "30s",
                "levels" : []
              },
              {
                "name": "Exercise C",
                "sets": "2",
                "reps": "3",
                "distance": "10m",
                "time": "10 sec",
                "restTime": "30s",
                "levels" : []
              },
              {
                "name": "Exercise D",
                "sets": "2",
                "reps": "3",
                "distance": "10m",
                "time": "10 sec",
                "restTime": "30s",
                "levels" : []
              }
            ]
          }
        ]
      }
    ]
  },
];

let newPlans = [
  {
    "name" : "Unranked: Early Off Season",
    "weeks" : 12,
    "days" : 6
  },
  {
    "name" : "Unranked: Late Off Season",
    "weeks" : 12,
    "days" : 6
  },
  {
    "name" : "Unranked: Pre Season",
    "weeks" : 12,
    "days" : 6
  },
  {
    "name" : "Unranked: In Season",
    "weeks" : 16,
    "days" : 6
  },
  {
    "name" : "Skill Code",
    "weeks" : 12,
    "days" : 5
  },
  {
    "name" : "Handle Snacks",
    "weeks" : 16,
    "days" : 6
  },
  {
    "name" : "The Twitch Code",
    "weeks" : 16,
    "days" : 3
  },
  {
    "name" : "Basketball Athleticism Code",
    "weeks" : 12,
    "days" : 6
  },
  {
    "name" : "Basketball Strength Code",
    "weeks" : 52,
    "days" : 6
  },
  {
    "name" : "HOOP IQ Vault",
    "weeks" : 2,
    "days" : 7
  },
  {
    "name" : "Lifestyle Development",
    "weeks" : 1,
    "days" : 3
  },
  {
    "name" : "Mindset Development",
    "weeks" : 1,
    "days" : 3
  },
]

function addExercises() {
  for (i=0; i< newPlans.length; i++) {
    for (x=0; x<newPlans[i].weeks.length; x++) {
      for (y=0; y<newPlans[i].weeks[x].workouts.length; y++) {
        for (z=0; z<newPlans[i].weeks[x].workouts[y].exercises.length; z++) {
          for (a=0; a<exercises.length; a++) {
            if (exercises[a].name == newPlans[i].weeks[x].workouts[y].exercises[z].name) {
              newPlans[i].weeks[x].workouts[y].exercises[z].levels = exercises[a].levels
            }
          }
        }
      }
    }
  }
}

let exercises = [
  {
    "name": "Exercise A",
    "levels": [
      {
        "level": 1,
        "link": "https://www.youtube.com/"
      },
      {
        "level": 2,
        "link": "https://www.youtube2.com/"
      }
    ]

  },
  {
    "name": "Exercise B",
    "levels": [
      {
        "level": 1,
        "link": "https://www.youtube.com/"
      }
    ]

  },
  {
    "name": "Exercise C",
    "levels": [
      {
        "level": 1,
        "link": "https://www.youtube.com/"
      }
    ]

  },
  {
    "name": "Exercise D",
    "levels": [
      {
        "level": 1,
        "link": "https://www.youtube.com/"
      }
    ]

  },
]

addExercises()

// Preload data if available
function preloadPlans() {
  // If there’s preloaded data, set it here. Example:
  // newPlans = [ { name: "Preloaded Plan", weeks: [...] }, ... ];

  // Render the preloaded data
  /*renderPlans();*/
}

// Function to render all newPlans
/*function renderPlans() {
  const plansContainer = document.getElementById('plansContainer');
  plansContainer.innerHTML = '';  // Clear the container

  newPlans.forEach((plan, planIndex) => {
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
          <input type="text" placeholder="YouTube Link" id="link${planIndex}${weekIndex}${workoutIndex}">
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
            <a href="${exercise.levels[0].link}" target="_blank">Watch Exercise</a>
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
*/
// Function to add a new plan
function addPlan() {
  const planName = document.getElementById('planName').value;
  if (planName.trim()) {
    newPlans.push({
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
    newPlans[planIndex].weeks.push({
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
    newPlans[planIndex].weeks[weekIndex].workouts.push({
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
  const link = document.getElementById(`link${planIndex}${weekIndex}${workoutIndex}`).value;

  if (exerciseName.trim()) {
    newPlans[planIndex].weeks[weekIndex].workouts[workoutIndex].exercises.push({
      name: exerciseName,
      sets: sets || '-',
      reps: reps || '-',
      distance: distance || '-',
      time: time || '-',
      restTime: restTime || '-',
      link: link || '#'
    });
    renderPlans();
  }
}

// Function to export the newPlans as JSON for saving
function exportPlans() {
  const dataStr = JSON.stringify(newPlans, null, 2); // Pretty-print JSON with indentation
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'workout_plans.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Function to copy the newPlans as JavaScript array (so you can paste it directly into the script)
function exportPlansAsJS() {
  const dataStr = JSON.stringify(newPlans, null, 2)
    .replace(/"([^"]+)":/g, '$1:')   // Remove quotes around keys
    .replace(/"/g, "'");              // Change quotes to single quotes for JS object notation
  const jsCode = `let newPlans = ${dataStr};`;

  const pre = document.createElement('pre');
  pre.textContent = jsCode;
  document.body.appendChild(pre);
}

// Call this on page load to preload newPlans
preloadPlans();
