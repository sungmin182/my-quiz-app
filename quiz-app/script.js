// 1. 게임 상태를 저장하는 전역 객체
const gameState = {
  playerCount: 2, // 플레이어 수 (기본값: 2)
  gradeLevel: "low", // 학년 수준 (기본값: 저학년)
  currentPlayer: 1, // 현재 턴인 플레이어
  scores: {}, // 플레이어별 점수 (예: { player1: 0, player2: 0 })
  currentScene: "setup-scene", // 현재 보여줄 장면의 ID
  allQuestions: null, // CSV에서 불러온 모든 문제 데이터 (초기값 null)
  currentQuestion: null, // 현재 출제된 문제 객체
  // 추가: 문제 히스토리 관리
  usedQuestions: new Set(), // 이미 푼 문제들의 ID 저장
  currentTopic: null, // 현재 선택된 주제
};

// 2. DOM 요소 캐싱
const scenes = document.querySelectorAll(".scene");
const questionTextElement = document.getElementById("question-text");
const answerOptionsElement = document.getElementById("answer-options");
const submitAnswerBtn = document.getElementById("submit-answer-btn");
const resultFeedbackElement = document.getElementById("result-feedback");
const toTopicBtn = document.getElementById("to-topic-btn");
const returnToTopicBtn = document.getElementById("return-to-topic-btn");
const selectedGradeElement = document.getElementById("selected-grade");
const playerIconsElement = document.getElementById("player-icons");
const scoreboardElement = document.getElementById("scoreboard");
const playerNamesElement = document.getElementById("player-names");

// 플레이어별 색상 클래스
const playerColorClasses = ["p1", "p2", "p3", "p4"];

// 문제에 고유 ID 부여하는 함수
function generateQuestionId(question) {
  return `${question.topic}_${question.gradeLevel}_${question.question.slice(
    0,
    20
  )}`;
}

// 2번 화면(주제 선택) 렌더링 함수
function renderTopicSceneInfo() {
  renderSelectedGrade();
  renderPlayerIcons();
  renderScoreboard();
}

// 3. CSV 파싱 함수: CSV 문자열을 받아 객체 배열로 반환
function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  const questions = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    if (values.length !== headers.length) continue;
    const questionObj = {
      topic: "",
      gradeLevel: "",
      question: "",
      options: [],
      correctAnswer: "",
    };
    const tempOptions = {};
    headers.forEach((header, idx) => {
      const value = values[idx];
      const lowerHeader = header.toLowerCase();
      if (lowerHeader === "topic") {
        questionObj.topic = value;
      } else if (lowerHeader === "gradelevel") {
        questionObj.gradeLevel = value;
      } else if (lowerHeader === "question") {
        questionObj.question = value;
      } else if (lowerHeader.startsWith("option")) {
        const optionKey = header.slice(-1);
        tempOptions[optionKey] = value;
      } else if (lowerHeader === "correctanswer") {
        questionObj.correctAnswer = value;
      }
    });
    ["A", "B", "C", "D"].forEach((optKey) => {
      if (tempOptions[optKey]) {
        questionObj.options.push({
          text: tempOptions[optKey],
          isCorrect: optKey === questionObj.correctAnswer,
        });
      }
    });
    questions.push(questionObj);
  }
  return questions;
}

// 4. 문제 데이터 로드 함수
async function loadQuestions() {
  try {
    const response = await fetch("./data/quiz_data.csv");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    gameState.allQuestions = parseCSV(csvText);
    console.log("퀴즈 데이터 로딩 완료:", gameState.allQuestions);
  } catch (error) {
    console.error("퀴즈 데이터 로딩 실패:", error);
    // 사용자에게 에러 메시지를 보여주는 UI 로직 추가 가능
  }
}

// 5. 장면을 렌더링하는 함수 (수정: topic-scene 진입 시 정보 렌더)
function renderScene() {
  const activeSceneId = gameState.currentScene;
  scenes.forEach((scene) => {
    scene.classList.add("hidden");
  });
  const activeScene = document.getElementById(activeSceneId);
  if (activeScene) {
    activeScene.classList.remove("hidden");
  }
  if (activeSceneId === "topic-scene") {
    renderTopicSceneInfo();
  }
}

// 6. 문제 화면에 현재 문제 표시 (수정: 현재 플레이어 안내 추가)
function displayCurrentQuestion() {
  const question = gameState.currentQuestion;
  if (!question) return;
  questionTextElement.innerHTML = `<span style='color:#6366f1;font-weight:700;'>플레이어${gameState.currentPlayer}</span>님의 차례입니다.<br><br>${question.question}`;
  answerOptionsElement.innerHTML = "";
  question.options.forEach((option, index) => {
    const optionId = `option-${index}`;
    const optionDiv = document.createElement("div");
    optionDiv.classList.add("option");
    const radioInput = document.createElement("input");
    radioInput.type = "radio";
    radioInput.name = "answer";
    radioInput.id = optionId;
    radioInput.value = option.text;
    const label = document.createElement("label");
    label.htmlFor = optionId;
    label.textContent = option.text;
    optionDiv.appendChild(radioInput);
    optionDiv.appendChild(label);
    answerOptionsElement.appendChild(optionDiv);
  });
}

// 7. 정답 체크 함수 (수정: 점수 반영)
function checkAnswer() {
  const selectedRadio = document.querySelector('input[name="answer"]:checked');
  if (!selectedRadio) {
    alert("답을 선택해주세요!");
    return;
  }
  const userAnswer = selectedRadio.value;
  const correctAnswerObj = gameState.currentQuestion.options.find(
    (opt) => opt.isCorrect
  );
  if (userAnswer === correctAnswerObj.text) {
    resultFeedbackElement.textContent = `정답입니다! 플레이어${gameState.currentPlayer}님 1점 획득!`;
    resultFeedbackElement.style.color = "green";
    // 점수 반영
    const key = `player${gameState.currentPlayer}`;
    gameState.scores[key] = (gameState.scores[key] ?? 0) + 1;
  } else {
    resultFeedbackElement.textContent = `오답입니다! 정답은 "${correctAnswerObj.text}" 입니다.`;
    resultFeedbackElement.style.color = "red";
  }
  gameState.currentScene = "result-scene";
  renderScene();
}

// 8. 퀴즈 시작 함수 (주제 선택 시 호출)
function startQuiz(topic) {
  gameState.currentTopic = topic;

  // 1. 선택된 주제와 학년에 맞는 문제들만 필터링
  const filteredQuestions = gameState.allQuestions.filter(
    (q) =>
      q.topic.toLowerCase() === topic.toLowerCase() &&
      q.gradeLevel.toLowerCase() === gameState.gradeLevel.toLowerCase()
  );

  if (filteredQuestions.length === 0) {
    alert("해당 주제와 학년에 맞는 문제가 없습니다.");
    return;
  }

  // 2. 아직 사용하지 않은 문제들만 필터링
  const unusedQuestions = filteredQuestions.filter((q) => {
    const questionId = generateQuestionId(q);
    return !gameState.usedQuestions.has(questionId);
  });

  // 3. 만약 모든 문제를 다 풀었다면 히스토리 초기화
  if (unusedQuestions.length === 0) {
    gameState.usedQuestions.clear();
    alert("모든 문제를 다 풀었습니다! 처음부터 다시 시작합니다.");
    unusedQuestions.push(...filteredQuestions);
  }

  // 4. 무작위 문제 선택
  const randomIndex = Math.floor(Math.random() * unusedQuestions.length);
  gameState.currentQuestion = unusedQuestions[randomIndex];

  // 5. 사용한 문제를 히스토리에 추가
  const questionId = generateQuestionId(gameState.currentQuestion);
  gameState.usedQuestions.add(questionId);

  // 6. 문제 화면으로 전환
  gameState.currentScene = "question-scene";
  renderScene();
  displayCurrentQuestion();
}

// 9. 이벤트 리스너 등록 (초기화 및 UI 상호작용)
document.addEventListener("DOMContentLoaded", () => {
  renderScene();

  // 학년 선택 라디오 버튼
  const gradeLevelRadios = document.querySelectorAll(
    'input[name="gradeLevel"]'
  );
  gradeLevelRadios.forEach((radio) => {
    radio.addEventListener("change", (event) => {
      gameState.gradeLevel = event.target.value;
      console.log("학년 수준 변경:", gameState.gradeLevel);
    });
  });

  // 플레이어 수 선택 라디오 버튼
  const playerCountRadios = document.querySelectorAll(
    'input[name="playerCount"]'
  );
  playerCountRadios.forEach((radio) => {
    radio.addEventListener("change", (event) => {
      gameState.playerCount = Number(event.target.value);
      console.log("플레이어 수 변경:", gameState.playerCount);
    });
  });

  // 문제 데이터 로드
  loadQuestions();

  // 1번 화면 → 2번 화면 이동 시 점수판/플레이어/히스토리 초기화
  toTopicBtn.addEventListener("click", () => {
    // 점수판 초기화
    gameState.scores = {};
    for (let i = 1; i <= gameState.playerCount; i++) {
      gameState.scores[`player${i}`] = 0;
    }
    gameState.currentPlayer = 1;
    // 히스토리 초기화
    gameState.usedQuestions.clear();
    gameState.currentTopic = null;
    gameState.currentScene = "topic-scene";
    renderScene();
  });

  // 2번 화면: 주제 버튼 클릭 이벤트
  const topicButtons = document.querySelectorAll(".topic-btn");
  topicButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      const selectedTopic = event.target.id.replace("btn-", ""); // 'environment', 'literacy', 'digital'
      startQuiz(selectedTopic);
    });
  });

  // 2번 화면 → 1번 화면 이동 (처음으로 돌아가기)
  const backToSetupBtn = document.getElementById("back-to-setup-btn");
  backToSetupBtn.addEventListener("click", () => {
    gameState.currentScene = "setup-scene";
    renderScene();
  });

  // 3번 화면: 정답 제출 버튼 이벤트
  submitAnswerBtn.addEventListener("click", checkAnswer);

  // 결과 화면에서 "다른 문제 풀기" 버튼 → 2번 화면(주제 선택)으로 이동
  returnToTopicBtn.addEventListener("click", () => {
    // 다음 플레이어로 턴 넘기기 (시계방향)
    gameState.currentPlayer =
      (gameState.currentPlayer % gameState.playerCount) + 1;
    gameState.currentScene = "topic-scene";
    gameState.currentQuestion = null;
    renderScene();
  });

  // 처음으로 돌아가기 버튼에 삼각형 아이콘 표시
  const backBtn = document.getElementById("back-to-setup-btn");
  if (backBtn) backBtn.textContent = "처음으로 돌아가기";
});
