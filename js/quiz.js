/**
 * quiz.js — Logika Inline Quiz E-Kamus (Max Score 100, Dwibahasa Keren)
 */
(function () {
  "use strict";

  window.quizApp = {
    questions: [],
    current: 0,
    score: 0,
    answered: false,
    currentAnswer: "",
    isCurrentPG: true, // Track PG(+5) atau Essay(+10)

    getAllWords: function () {
      var chapters =
        (window.appData &&
          window.appData.kosakata &&
          window.appData.kosakata.chapters) ||
        [];
      var words = [];
      chapters.forEach(function (ch) {
        if (ch && Array.isArray(ch.words)) words = words.concat(ch.words);
      });
      return words;
    },

    shuffle: function (arr) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i];
        a[i] = a[j];
        a[j] = t;
      }
      return a;
    },

    levenshtein: function (a, b) {
      var m = a.length,
        n = b.length;
      var dp = [];
      for (var i = 0; i <= m; i++) {
        dp[i] = [i];
        for (var j = 1; j <= n; j++) dp[i][j] = i === 0 ? j : 0;
      }
      for (var ii = 1; ii <= m; ii++) {
        for (var jj = 1; jj <= n; jj++) {
          dp[ii][jj] =
            a[ii - 1] === b[jj - 1]
              ? dp[ii - 1][jj - 1]
              : 1 +
                Math.min(dp[ii - 1][jj], dp[ii][jj - 1], dp[ii - 1][jj - 1]);
        }
      }
      return dp[m][n];
    },

    playBeep: function (isCorrect) {
      try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        var osc = ctx.createOscillator(),
          gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        if (isCorrect) {
          osc.type = "sine";
          osc.frequency.setValueAtTime(523, ctx.currentTime);
          osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
        } else {
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(280, ctx.currentTime);
          osc.frequency.setValueAtTime(190, ctx.currentTime + 0.2);
        }
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch (e) {}
    },

    speak: function (text) {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();

      var u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 0.78;
      u.pitch = 1.25;

      var femalePattern =
        /samantha|fiona|karen|moira|tessa|veena|victoria|zira|heather|susan|female|woman|girl|zoe|alice|ava|emily|lisa|catherine|nicky/i;

      function pickVoice(voices) {
        return (
          voices.find(function (v) {
            return (
              v.lang.toLowerCase().startsWith("en") &&
              femalePattern.test(v.name)
            );
          }) ||
          voices.find(function (v) {
            return v.lang.toLowerCase().startsWith("en");
          })
        );
      }

      var voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        var v = pickVoice(voices);
        if (v) u.voice = v;
        window.speechSynthesis.speak(u);
      } else {
        window.speechSynthesis.onvoiceschanged = function () {
          window.speechSynthesis.onvoiceschanged = null;
          var v2 = pickVoice(window.speechSynthesis.getVoices());
          if (v2) u.voice = v2;
          window.speechSynthesis.speak(u);
        };
      }
    },

    buildQuestions: function () {
      var all = this.getAllWords();
      if (all.length === 0) return false;

      while (all.length < 15) all = all.concat(all);

      var pool = this.shuffle(all);
      var pgWords = pool.slice(0, 10).map(function (w) {
        return { word: w, type: "pg" };
      });
      var essayWords = pool.slice(10, 15).map(function (w) {
        return { word: w, type: "essay" };
      });

      this.questions = pgWords.concat(essayWords);
      return true;
    },

    start: function () {
      if (
        !window.appData ||
        !window.appData.kosakata ||
        !window.appData.kosakata.chapters ||
        window.appData.kosakata.chapters.length === 0
      ) {
        setTimeout(function () {
          window.quizApp.start();
        }, 500);
        return;
      }

      if (!this.buildQuestions()) return;

      document.getElementById("qz-loading").style.display = "none";
      document.getElementById("inline-quiz-app").style.display = "flex";

      // Halaman Awal
      document.getElementById("qz-screen-start").style.display = "flex";
      document.getElementById("qz-screen-question").style.display = "none";
      document.getElementById("qz-result").style.display = "none";
    },

    startQuestions: function () {
      document.getElementById("qz-screen-start").style.display = "none";
      document.getElementById("qz-screen-question").style.display = "flex";

      this.current = 0;
      this.score = 0;
      this.renderQuestion();
    },

    renderQuestion: function () {
      this.answered = false;
      var q = this.questions[this.current];
      var w = q.word;
      this.isCurrentPG = q.type === "pg";

      var fb = document.getElementById("qz-feedback");
      fb.style.display = "none";
      document.getElementById("qz-pg-area").style.pointerEvents = "auto";

      // Update Teks Dwibahasa Progress & Score
      document.getElementById("qz-progress").innerHTML =
        "Question " + (this.current + 1) + " / 15";

      document.getElementById("qz-score").innerHTML = "Score: " + this.score;

      var charL = document.getElementById("qz-char-left");
      var charR = document.getElementById("qz-char-right");
      charL.src = "./img/think1.png";
      charR.src = "./img/think2.png";
      this.triggerCharAnim(charL);
      this.triggerCharAnim(charR);

      var imgEl = document.getElementById("qz-img");
      var emojiEl = document.getElementById("qz-emoji");

      if (w.img && w.img !== "null" && w.img !== "") {
        imgEl.src = w.img;
        imgEl.style.display = "inline-block";
        emojiEl.style.display = "none";
      } else {
        imgEl.style.display = "none";
        emojiEl.textContent = w.emoji || "";
        emojiEl.style.display = "inline-block";
      }

      document.getElementById("qz-word").textContent = w.id_;

      // Teks Dwibahasa Instruksi
      document.getElementById("qz-instruction").innerHTML = this.isCurrentPG
        ? ""
        : "";

      this.currentAnswer = w.en;

      if (this.isCurrentPG) {
        document.getElementById("qz-pg-area").style.display = "grid";
        document.getElementById("qz-essay-area").style.display = "none";
        this.renderPGChoices(w);
      } else {
        document.getElementById("qz-pg-area").style.display = "none";
        document.getElementById("qz-essay-area").style.display = "flex";
        var inp = document.getElementById("qz-essay-input");
        inp.value = "";
        inp.disabled = false;
        document.getElementById("qz-essay-submit").style.display = "block";
      }
    },

    renderPGChoices: function (w) {
      var all = this.getAllWords();
      var others = this.shuffle(
        all.filter(function (v) {
          return v.en !== w.en;
        }),
      ).slice(0, 3);
      var choices = this.shuffle(
        [{ en: w.en, correct: true }].concat(
          others.map(function (v) {
            return { en: v.en, correct: false };
          }),
        ),
      );

      for (var i = 0; i < 4; i++) {
        var btn = document.getElementById("qz-pg-" + i);
        btn.textContent = choices[i].en;
        btn.className = "qz-btn-pg";
        btn.dataset.correct = choices[i].correct ? "1" : "0";
      }
    },

    triggerCharAnim: function (el) {
      el.classList.remove("pop");
      void el.offsetWidth;
      el.classList.add("pop");
    },

    showFeedback: function (isCorrect) {
      this.answered = true;
      var fb = document.getElementById("qz-feedback");
      var fbText = document.getElementById("qz-fb-text");
      var fbAns = document.getElementById("qz-fb-ans");
      var charL = document.getElementById("qz-char-left");
      var charR = document.getElementById("qz-char-right");

      fb.style.display = "block";

      if (isCorrect) {
        var pointGained = this.isCurrentPG ? 5 : 10;
        this.score += pointGained;

        document.getElementById("qz-score").innerHTML = "Score: " + this.score;

        charL.src = "./img/happy1.png";
        charR.src = "./img/happy2.png";
        fb.style.background = "#E8F5E9";
        fb.style.border = "2px solid #A5D6A7";

        // Dwibahasa Feedback
        fbText.innerHTML = "You are Right!";
        fbText.style.color = "#2E7D32";
        fbAns.innerHTML = "";

        this.speak(this.currentAnswer);
      } else {
        charL.src = "./img/sad1.png";
        charR.src = "./img/sad2.png";
        fb.style.background = "#FFEBEE";
        fb.style.border = "2px solid #EF9A9A";

        // Dwibahasa Feedback
        fbText.innerHTML = "Not Quite!";
        fbText.style.color = "#C62828";
      }

      this.triggerCharAnim(charL);
      this.triggerCharAnim(charR);
      this.playBeep(isCorrect);

      var btnNext = document.getElementById("qz-btn-next");
      if (this.current === 14) {
        btnNext.innerHTML = "See Final Score";
      } else {
        btnNext.innerHTML = "Next";
      }
    },

    answerPG: function (idx) {
      if (this.answered) return;
      document.getElementById("qz-pg-area").style.pointerEvents = "none";

      var btn = document.getElementById("qz-pg-" + idx);
      var isCorrect = btn.dataset.correct === "1";

      for (var i = 0; i < 4; i++) {
        var b = document.getElementById("qz-pg-" + i);
        if (b.dataset.correct === "1") b.classList.add("correct");
        else if (i === idx && !isCorrect) b.classList.add("wrong");
      }

      this.showFeedback(isCorrect);
    },

    answerEssay: function () {
      if (this.answered) return;
      var inp = document.getElementById("qz-essay-input");
      var val = inp.value.trim().toLowerCase();
      if (!val) {
        inp.focus();
        return;
      }

      inp.disabled = true;
      document.getElementById("qz-essay-submit").style.display = "none";

      var ans = this.currentAnswer.toLowerCase();
      var dist = this.levenshtein(val, ans);
      var isCorrect =
        val === ans || (dist === 1 && val.length >= ans.length - 1);

      this.showFeedback(isCorrect);
    },

    nextQuestion: function () {
      this.current++;
      if (this.current >= 15) {
        this.showResult();
      } else {
        this.renderQuestion();
      }
    },

    showResult: function () {
      document.getElementById("qz-screen-question").style.display = "none";
      var res = document.getElementById("qz-result");
      res.style.display = "flex";

      var charCenter = document.getElementById("qz-result-char-center");
      var title = document.getElementById("qz-result-title");
      var subtitle = document.getElementById("qz-result-subtitle");
      var scoreVal = this.score;

      document.getElementById("qz-result-score").textContent = scoreVal;

      // if (scoreVal === 100) {
      //   charCenter.src = "./img/score-100.png";
      //   title.innerHTML = "Sempurna!";
      //   title.style.color = "#FFB300";
      //   subtitle.innerHTML = "Kamu hebat banget!";
      // } else if (scoreVal >= 90) {
      //   charCenter.src = "./img/score-90.png";
      //   title.innerHTML = "Luar Biasa!";
      //   title.style.color = "#1565C0";
      //   subtitle.innerHTML = "Dikit lagi sempurna!";
      // } else if (scoreVal >= 80) {
      //   charCenter.src = "./img/score-80.png";
      //   title.innerHTML = "Hebat!";
      //   title.style.color = "#2E7D32";
      //   subtitle.innerHTML = "Pintar sekali!";
      // } else if (scoreVal >= 70) {
      //   charCenter.src = "./img/score-70.png";
      //   title.innerHTML = "Bagus!";
      //   title.style.color = "#0277BD";
      //   subtitle.innerHTML = "Terus berlatih ya!";
      // } else if (scoreVal >= 60) {
      //   charCenter.src = "./img/score-60.png";
      //   title.innerHTML = "Cukup Bagus!";
      //   title.style.color = "#F57C00";
      //   subtitle.innerHTML = "Yuk, belajar lagi!";
      // } else {
      //   charCenter.src = "./img/score-50.png";
      //   title.innerHTML = "Semangat!";
      //   title.style.color = "#C62828";
      //   subtitle.innerHTML = "Jangan menyerah ya!";
      // }

      if (scoreVal === 100) {
        charCenter.src = "./img/score-100.png";
        title.innerHTML = "Perfect!";
        title.style.color = "#FFB300";
        subtitle.innerHTML = "You are amazing!";
      } else if (scoreVal >= 90) {
        charCenter.src = "./img/score-90.png";
        title.innerHTML = "Excellent!";
        title.style.color = "#1565C0";
        subtitle.innerHTML = "Almost perfect!";
      } else if (scoreVal >= 80) {
        charCenter.src = "./img/score-80.png";
        title.innerHTML = "Great Job!";
        title.style.color = "#2E7D32";
        subtitle.innerHTML = "So smart!";
      } else if (scoreVal >= 70) {
        charCenter.src = "./img/score-70.png";
        title.innerHTML = "Very Good!";
        title.style.color = "#0277BD";
        subtitle.innerHTML = "Keep it up!";
      } else if (scoreVal >= 60) {
        charCenter.src = "./img/score-60.png";
        title.innerHTML = "Good Try!";
        title.style.color = "#F57C00";
        subtitle.innerHTML = "Let's read again!";
      } else {
        charCenter.src = "./img/score-50.png";
        title.innerHTML = "Cheer Up!";
        title.style.color = "#C62828";
        subtitle.innerHTML = "Don't give up!";
      }

      this.triggerCharAnim(charCenter);
    },
  };

  var initInterval = setInterval(function () {
    if (document.getElementById("inline-quiz-app")) {
      clearInterval(initInterval);
      window.quizApp.start();
    }
  }, 300);
})();
