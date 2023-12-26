const path = require("path");
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
  "mongodb+srv://hanyw:1234@cluster0.to8wb9t.mongodb.net/?retryWrites=true&w=majority";

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

// build
app.use(express.static(path.join(__dirname, "build")));

// 회원가입
app.post("/signup", async (req, res) => {
  const { userId, userPw, userEmail, profileImage } = req.body;

  try {
    // 중복 사용자 검사
    const existingUser = await mydb.collection("account").findOne({ userId });
    if (existingUser) {
      return res.status(409).json({ error: "이미 존재하는 사용자입니다." });
    }

    await mydb.collection("account").insertOne({
      userId,
      userPw: sha(userPw),
      userEmail,
      profileImage,
    });

    console.log("회원가입 성공");
    res.json({ message: "회원가입 성공" });
  } catch (err) {
    console.log("회원가입 에러: ", err);
    res.status(500).json({ error: "서버 오류" });
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
  try {
    const user = await mydb.collection("account").findOne({ userId });
    if (user && user.userPw === sha(userPw)) {
      // 세션에 userId와 userEmail을 저장
      req.session.user = {
        userId: user.userId,
        userEmail: user.userEmail,
        profileImage: user.profileImage, // 프로필 이미지도 저장
      };
      res.json({ user: req.session.user });
    } else {
      res.status(401).json({ err: "로그인 정보가 정확하지 않습니다." });
    }
  } catch (err) {
    res.status(500).json({ err: "서버 오류" });
  }
});

// 로그아웃
app.get("/logout", (req, res) => {
  console.log("로그아웃");
  req.session.destroy();

  res.json({ user: null });
});

// My profile
app.get("/user/profile", async (req, res) => {
  // 세션에서 사용자 정보 가져오기
  const { userId, userEmail, profileImage } = req.session.user || {};

  if (!userId) {
    return res.status(401).json({ error: "로그인되지 않았습니다." });
  }

  // 로그인 세션 정보를 그대로 반환
  res.json({ userId, userEmail, profileImage });
});

/* 
// 프로필 정보를 반환하는 엔드포인트
app.get("/profile", async (req, res) => {
  try {
    // 세션에 저장된 사용자 정보를 가져옵니다.
    const loggedInUserId = req.session.user.userId;

    // 해당 사용자의 정보만 DB에서 가져옵니다.
    const user = await mydb
      .collection("account")
      .findOne({ userId: loggedInUserId });

    // 해당 사용자의 정보를 클라이언트에게 전달합니다.
    res.status(200).json(user);
  } catch (error) {
    console.error("프로필 정보 가져오기 에러:", error);
    res.status(500).json({ error: "서버 오류" });
  }
}); */

// MonthDiary 스키마 정의
const monthlySchema = new mongoose.Schema({
  title: String,
  image: String,
});

const MonthDiaries = mongoose.model("MonthDiaries", monthlySchema);

// 일기장 생성
app.post("/monthDiary/new", async (req, res) => {
  const { title, image } = req.body; // 이미지 정보를 받습니다
  try {
    const newMDiary = new MonthDiaries({ title, image });
    const savedDiary = await newMDiary.save();
    res.status(200).json(savedDiary); // 저장된 일기장 반환
  } catch (err) {
    console.log("작성 오류: ", err);
    res.status(500).send("서버 작성 오류");
  }
});

// 일기장 목록 가져오기
app.get("/monthDiary/list", async (req, res) => {
  try {
    const diaryList = await MonthDiaries.find({});
    res.json(diaryList);
  } catch (error) {
    console.log("일기장 목록 가져오기 오류: ", error);
    res.status(500).send("일기장 목록을 가져오는데 문제가 발생했습니다.");
  }
});

// 일기장 삭제
app.delete("/monthDiary/delete/:id", async (req, res) => {
  const diaryId = req.params.id;

  try {
    const deleteResult = await MonthDiaries.findByIdAndDelete(diaryId);

    if (deleteResult) {
      console.log(`일기장이 삭제되었습니다: ${diaryId}`);
      res.status(200).json({ message: "일기장이 삭제되었습니다." });
    } else {
      // 삭제할 데이터가 없는 경우
      res.status(404).json({ message: "해당 일기장을 찾을 수 없습니다." });
    }
  } catch (err) {
    console.error("일기장 삭제 오류: ", err);
    res.status(500).send("일기장 삭제 중 서버 오류가 발생했습니다.");
  }
});

// Post 모델 정의
const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  wdate: { type: Date, default: Date.now },
});

const Post = mongoose.model("Post", postSchema);

// 일기 목록
app.get("/posts", async (req, res) => {
  try {
    const skip = 0;
    const posts = await Post.find().sort({ wdate: -1 }).skip(skip).lean();

    res.json({ docs: posts });
  } catch (error) {
    console.log("posts err: ", error);
    res.status(500).send("posts 서버 오류");
  }
});

// 일기 작성
app.post("/posting", async (req, res) => {
  const { title, content, wdate } = req.body;
  try {
    const newPost = new Post({ title, content, wdate });
    await newPost.save();
    res.sendStatus(200);
  } catch (error) {
    console.log("작성 오류: ", error);
    res.status(500).send("서버 작성 오류");
  }
});

// 일기 보기
app.get("/posts/read/:id", async (req, res) => {
  const postId = req.params.id;
  console.log(postId);

  try {
    const post = await Post.findOne({ _id: postId }).lean();
    if (!post) {
      return res.status(404).json({ error: "내용을 찾을 수 없습니다" });
    }
    res.json(post);
  } catch (error) {
    console.log("읽기 오류: ", error);
    res.status(500).send("서버 읽기 오류");
  }
});

// 일기 삭제
app.get("/posts/delete/:id", async (req, res) => {
  const postId = req.params.id;
  try {
    await Post.deleteOne({ _id: postId });
    res.sendStatus(200);
  } catch (error) {
    console.log("삭제 오류: ", error);
    res.status(500).send("서버 삭제 오류");
  }
});

// 일기 수정
app.post("/posts/update", async (req, res) => {
  const { id, title, content, writer, wdate } = req.body;
  try {
    await Post.updateOne({ _id: id }, { title, content, writer, wdate });
    res.sendStatus(200);
  } catch (error) {
    console.log("수정 오류: ", error);
    res.status(500).send("서버 수정 오류");
  }
});

// 포트8080 연결
app.listen(PORT, () => {
  console.log("8080번 포트에서 실행 중");
});
