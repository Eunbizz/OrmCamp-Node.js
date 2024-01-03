// 게시글 정보 관리 각종 웹페이지 요청과 응답처리 라우터 
// localhost:3000/article/~

var express = require('express');
var router = express.Router();

var db = require('../models/index.js');
const Op = db.Sequelize.Op;
var sequelize = db.sequelize;
const {QueryTypes} = sequelize;

// 게시글 목록 조회 웹페이지 요청 및 응답 라우팅메소드
// localhost:3000/article/list
router.get('/list', async(req, res)=>{

    var searchOption = {
        boardTypeCode:"0", 
        title:"",
        isDisplayCode:"9"
    };

    // step1: DB에서 모든 게시글 데이터 목록 조회
    // db.Article.findAll() 메소드는 article 테이블에 모든 데이터를 조회
    // SELECT * FROM article();
    // SELECT article,,, FROM article WHERE is_display_code=1 AND view_count!=0;
    // var articles = await db.Article.findAll(
    //     {
    //         attributes: ['article_id','board_type_code','title','article_type_code','view_count','is_display_code','reg_date','reg_member_id'],
    //         // where:{
    //         //     is_display_code:1,
    //         //     view_count: {[Op.not]:0}},
    //         order: [['article_id','DESC']] //DESC 오름차순, ASC 내림차순
    //     }

    // );

    // var sqlQuery = `SELECT article_id,board_type_code,title,article_type_code,view_count,ip_address,is_display_code,reg_date,reg_member_id
    //                 FROM article
    //                 WHERE is_display_code = 1
    //                 ORDER BY article_id DESC;`
    
    // var articles = await sequelize.query(sqlQuery,{
    //     raw:true,
    //     type:QueryTypes.SELECT
    // });

    var articles = await sequelize.query("CALL SP_CHAT_ARTICLE_DISPLAY (:P_DISPLAY_CODE)",
        { replacements: { P_DISPLAY_CODE: 1 } }
        );
    
    // Select Count(*) From article 
    var articleCount = await db.Article.count();

    // step2: 게시글 전체 목록을 list.ejs 뷰에 전달
    res.render('article/list.ejs', {articles,searchOption,articleCount});
});

// 게시글 목록에서 조회 옵션 데이터를 전달받아 게시글 목록 조회 후
// 게시글 목록 페이지에 대한 요청과 응답처리
router.post('/list', async(req, res)=>{

    // step1: 사용자가 선택/입력한 조회옵션 데이터 추출
    var boardTypeCode = req.body.boardTypeCode;
    var title = req.body.title;
    var isDisplayCode = req.body.isDisplayCode;

    var searchOption = {
        boardTypeCode, 
        title,
        isDisplayCode
    };

    // step2: 사용자가 입력/선택한 조회옵션 데이터를 기반으로 DB에서
    // 게시글 목록을 재조회해온다
    // SELECT * FROM article WHERE board_type_code = 1
    var articles = await db.Article.findAll({where:{board_type_code:searchOption.boardTypeCode}});

    // step3: 게시글 목록 페이지 list.ejs
    res.render('article/list.ejs', {articles, searchOption});

});

// 신규 게시글 등록 웹페이지 요청 및 응답 라우팅메소드
router.get('/create', async(req, res)=>{
    res.render('article/create.ejs');
});

// 신규 게시글 사용자 등록정보 처리 요청 및 라우팅메소드
router.post('/create', async(req, res)=>{

    // step1: 사용자가 입력한 게시글 등록 데이터 추출
    var boardTypeCode = req.body.boardTypeCode;
    var title = req.body.title;
    var contents = req.body.contents;
    var articleTypeCode = req.body.articleTypeCode;
    var isDisplayCode = req.body.isDisplayCode;
    var register = req.body.register;

    // step2: 추출된 사용자 입력 데이터를 단일 게시글 json 데이터로 구성해서
    // DB article 테이블에 영구적으로 저장처리한다
    // 저장처리 후 article 테이블에 저장된 데이터 반환된다

    // 등록할 게시글 데이터
    // **중요** 테이블에 저장/수정할 데이터소스는 반드시 데이터모델의 속성명을 이용해야한다.
    // 속성:변수
    // **조심** article 모델 컬럼에 값이 반드시 들어와야하는 값(IS NOT NULL)은 전달해야함
    var article = {
        board_type_code:boardTypeCode, 
        title,
        contents,
        view_count:0,
        ip_address:'111.222.222.222',
        article_type_code:articleTypeCode,
        is_display_code:isDisplayCode,
        reg_member_id:1,
        reg_date:Date.now()
    };
    
    // 게시글 정보를 article 테이블에 저장하고 저장된 값을 다시 반환받는다
    // var registedArticle = await db.Article.create(article);
    await db.Article.create(article);

    // step3: 등록처리 후 게시글 목록 웹페이지로 이동처리
    res.redirect('/article/list');
});

// 기존 게시물 삭제 처리 요청 및 응답 라우팅메소드 
// localhost:3000/article/delete?aid=1
router.get('/delete', async(req, res)=>{

    // step1: 삭제하려는 게시글 고유번호를 추출
    var articleIdx = req.query.aid;

    // step2: 게시번호 기반으로 실제 DB article 테이블에서 데이터를 삭제처리
    var deletedCnt = await db.Article.destroy({where:{article_id:articleIdx}});

    // step3: 게시글 목록 페이지로 이동
    res.redirect('/article/list');
});

// 기존 게시글 정보 확인 및 수정 웹페이지 요청과 응답 라우팅메소드
// localhost:3000/article/modify/1
// GET
router.get('/modify/:aid', async(req, res)=>{

    // step 1: 선택한 게시글 고유번호를 파라미터 방식으로 url을 통해 전달받음
    var articleIdx = req.params.aid;

    // step 2: 해당 게시글 번호에 해당하는 단일 게시글 정보를 DB article 테이블에서 조회해온다.
    var article = await db.Article.findOne({where:{article_id:articleIdx}});

    // 단일 게시글에 동적 속성 기반 댓글 목록 속성 추가
    article.comments = [{comment_id:1,comment:'댓글1입니당.'},{comment_id:2,comment:'댓글2입니당.'}];

    // step 3: 단일 게시글 정보로 뷰에 전달한다.
    res.render('article/modify.ejs', {article});
});

// 기존 게시글 사용자 수정 정보 처리 및 요청과 응답 라우팅메소드
// http://localhost:3000/article/modify/1
// POST
router.post('/modify/:aid', async(req, res)=>{

    var articleIdx = req.params.aid;

     // step1: 사용자가 입력한 게시글 등록 데이터 추출
     var boardTypeCode = req.body.boardTypeCode;
     var title = req.body.title;
     var contents = req.body.contents;
     var articleTypeCode = req.body.articleTypeCode;
     var isDisplayCode = req.body.isDisplayCode;
     var register = req.body.register;
 
     // step2: 추출된 사용자 입력 데이터를 단일 게시글 json 데이터로 구성해서
     // DB article 테이블에 수정 처리한다.
     // 수정 처리하면 처리건수 값이 반환
 
     // 수정할 게시글 데이터
     var article = {
         board_type_code:boardTypeCode, 
         title,
         contents,
         article_type_code:articleTypeCode,
         is_display_code:isDisplayCode,
         ip_address:"111.111.111.111",
         edit_member_id:register,
         edit_date:Date.now()
     };

     // DB article 테이블의 칼럼 내용을 수정하고 수정건수 반환받기
     // await db.Article.update(수정할데이터, 조건)
     // UPDATE article SET board_type_code,title='',contents=''...WHERE aticle_id=1;
     var updatedCount = await db.Article.update(article,{where:{article_id:articleIdx}});
 
     // step3: 등록처리 후 게시글 목록 웹페이지로 이동처리
    res.redirect('/article/list');
});

module.exports = router;