const express = require("express");
const app = express();
const mongoose = require("mongoose");
const sha = require("sha256");
const cors = require("cors");
const session = require("express-session");

app.use(
  session({
    secret: "dges1csdggh1234ts5fsh2",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(cors());
app.use(express.json());

const PORT = 8080;
const URL =
  "mongodb+srv://suin:wndkstndls1!@cluster0.exfpvsq.mongodb.net/?retryWrites=true&w=majority";

// mongoDB 연결
let mydb;
mongoose
  .connect(URL, { dbName: "db1" })
  .then(() => {
    console.log("MongoDB에 연결되었습니다.");
    mydb = mongoose.connection.db;
  })
  .catch((err) => {
    console.log("MongoDB 연결 실패: ", err);
  });

app.post("/signup", async (req, res) => {
  console.log(req.body.userId);
  console.log(req.body.userPw);
  console.log(req.body.userEmail);

  try {
    await mydb.collection("account").insertOne({
      userId: req.body.userId,
      userPw: sha(req.body.userPw),
      userEmail: req.body.userEmail,
    });
    console.log("회원가입 성공");
    res.json({ message: "회원가입 성공" });
  } catch (err) {
    console.log("회원가입 에러: ", err);
    res.send({ error: err });
    res.status(500).send({ error: err });
  }
});

// 로그인 :유지
const checkUserSession = (req, res) => {
  if (req.session.user) {
    console.log("세션 유지");
    res.json({ user: req.session.user });
  } else {
    res.json({ user: null });
  }
};

app.get("/login", checkUserSession);
app.get("/", checkUserSession);

// 로그인 :값 확인
app.post("/login", async (req, res) => {
  const { userId, userPw } = req.body;
  console.log("id:", userId);
  console.log(`pw: ${userPw}`);

  try {
    const result = await mydb.collection("account").findOne({ userId });
    if (!result) {
      return res.json({ err: "아이디를 찾을 수 없습니다." });
    } else if (result.userPw && result.userPw === sha(userPw)) {
      req.session.user = { userId, userPw };
      console.log("새로운 로그인");
      res.json({ user: req.session.user });
    } else {
      return res.json({ err: "비밀번호가 틀렸습니다." });
    }
  } catch (err) {
    console.log("로그인 에러: ", err);
    res.status(500).json({ err: "서버 오류" });
  }
});

// 로그아웃
app.get("/logout", (req, res) => {
  console.log("로그아웃");
  req.session.destroy();

  res.json({ user: null });
});

// 포트8080 연결
app.listen(PORT, () => {
  console.log("8080번 포트에서 실행 중");
});
