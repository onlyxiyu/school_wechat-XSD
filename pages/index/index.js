
const uploader = require("../../utils/util.js");

const app = getApp()

wx.onUserCaptureScreen(function (res) {
  console.log("res：" + JSON.stringify(res));
})

Page({
  data: {
    show_auth:app.globalData.show_auth,
    userInfo: {},
    hasUserInfo: false,
    school: '',
    praiseBorder: '',
    notPraiseBorder: '',
    posts: [],
    postType: 1,
    baseImageUrl: app.globalData.imageUrl,
    show: 0,
    hidden: false,
    showCommentInput: false,
    showCommentInput: false,
    commentContent: '',
    commentObjId: '',
    commentType: '',
    refcommentId: '',
    pageSize: 10,
    pageNumber: 1,
    initPageNumber: 1,
    showGeMoreLoadin: false,
    currentTime: '',
    notDataTips: false,
    newMessage: false,
    newMessageNumber: 0,
    select: 1,
    animationData: {},
    commentValue: '',
    showNormal: app.globalData.showNormal,
    showAudit: app.globalData.showAudit
  },

  onLoad: function (e) {
    wx.showLoading({
      title: '加载中',
    });

    app.getConfig(config=>{

      if (config == 3) {
        app.globalData.showNormal = false;
        app.globalData.showAudit = true;
      } else {
        app.globalData.showNormal = true;
        app.globalData.showAudit = false;
      }

      this.setData({
        showNormal: app.globalData.showNormal,
        showAudit: app.globalData.showAudit
      });
    });

    let that = this;
    wx.getSetting({
      success(res) {
        if (!res.authSetting['scope.userInfo']) {
          that.setData({
            show_auth:true
          });
        }
      }
    })

    //设置当前时间
    this.setData({
      currentTime: uploader.formatTime(new Date())
    });

    let _this = this;
    let token = wx.getStorageSync('token');
    console.log('获取到token:' + token);

    _this.getSchool(_this);
    _this.getPost(this);

  },
  
  onShow: function (option) {

    console.log('学校是否变了:' + app.globalData.changeSchool);

    let _this = this;

    if (app.globalData.changeSchoolPost) {
      //切换了学校
      this.setData({
        posts: [],
        pageNumber: this.data.initPageNumber
      });
      app.globalData.changeSchoolPost = false;
      _this.getPost(this);
      //设置当前时间
      this.setData({
        currentTime: uploader.formatTime(new Date())
      });
    } else {
      _this.getMostNewPost();
    }

    _this.getSchool(_this);

    let type = 0;
    app.getNewInbox(type, function (res) {
      console.log("新消息数量：" + res.data.data);
      if (res.data.data != 0 && res.data.data != null && res.data.data != '') {
        _this.setData({
          newMessage: true,
          newMessageNumber: res.data.data
        });
      } else {
        _this.setData({
          newMessage: false,
          newMessageNumber: 0
        });
      }
    });
  },
  /**
   * 监听用户点击授权按钮
   */
  getAuthUserInfo:function(data){
    app.globalData.show_auth = false;
    this.setData({
      show_auth:false
    });

    let _this = this;
    app.login(null, null, null, function(){
      _this.getPost(_this);
      app.getUploadToken();
    });
  },
  onShareAppMessage: function (res) {
    if (res.from === 'button') {
      // 来自页面内转发按钮
      console.log(res.target)
    }
    return {
      title: '说出你心中最想对ta说的话吧',
      path: '/pages/index/index',
      success: function (res) {
        // 转发成功
      },
      fail: function (res) {
        // 转发失败
      }
    }
  },

  /**
   * 获取具体类型的贴子
   */
  selected(e) {
    console.log(e);
    console.log('selected');
    console.log(e.target.dataset.type);

    let objType = e.target.dataset.type;
    this.setData({
      select: objType,
      postType: objType,
      posts: []
    })

    this.setData({
      pageNumber: this.data.initPageNumber
    });

    let _this = this;

    _this.getPost(this);

  },
  /**
   * 进入新消息列表
   */
  openMessage: function () {
    wx.navigateTo({
      url: '/pages/message/message?type=0&new_message=1'
    })
  },

  /**
   * 下拉刷新，获取最新的贴子
   */
  onPullDownRefresh: function () {

    console.log('当前时间：' + this.data.currentTime);

    this.getMostNewPost();
  },

  /**
   * 上拉加载更多
   */
  onReachBottom: function () {

    console.log('到底了');

    let _this = this;

    this.setData({
      showGeMoreLoadin: true
    });

    this.getPost(_this);

  },

  /**
   * 事件处理函数
   */
  bindViewTap: function () {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },

  /**
   * 获取用户信息
   */
  getUserInfo: function (e) {
    console.log(e)
    app.globalData.userInfo = e.detail.userInfo
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  },

  /** 
   * 进入发表页面
   */
  post: function () {
    console.log('Post');

    wx.navigateTo({
      url: '/pages/post/post'
    })
  },

  /**
   * 进入选择学校页面
   */
  selectSchool: function () {
    console.log('select school');

    wx.navigateTo({
      url: '/pages/school/school'
    })
  },

  /**
   * 获取学校
   */
  getSchool: function (_this) {
    console.log('get school');

    app.http('GET', '/school', {}, function (res) {

      console.log(res.data);

      _this.setData({
        school: res.data.data
      });

    });
  },

  /**
   * 获取最新的贴子
   */
  getMostNewPost: function () {

    let _this = this;

    //获取新的贴子
    app.http('get', '/most_new_post', {
      date_time: this.data.currentTime
    }, res => {

      _this.setData({
        currentTime: uploader.formatTime(new Date())
      });

      wx.stopPullDownRefresh();

      console.log('返回的贴子数据');
      console.log(res.data.data);

      let posts = _this.data.posts;
      if(res.data.data){
        if (res.data.data.length > 0) {
          res.data.data.map(item => {
            let ifRepeat = false;

            for (let post of posts) {
              if (post.id == item.id) {
                ifRepeat = true;
              }
            }

            if (!ifRepeat) {
              posts.unshift(item);
            }
          });

          _this.setData({
            posts: posts
          });

        }
      }

    });

  },

  /**
   * 发表贴子后获取最新的贴子
   */
  getNewPost: function () {

    //获取新的贴子
    app.http('get', '/post', {
      page_size: 10,
      page_number: 1
    }, res => {

      console.log('返回的贴子数据');
      console.log(res.data.data);

      if (res.data.data != null){
        this.setData({
          posts: res.data.data.page_data,
          pageNumber: this.data.initPageNumber
        });
      }

    });


  },

  /**
   * 获取贴子
   */
  getPost: function (_this, objType = null) {

    console.log('function getPost');
    console.log(this.data.postType)

    let that = this;

    let order_by = 'created_at';
    let sort_by = 'desc';

    if (this.data.postType == 4) {
      order_by = 'praise_number';
      sort_by = 'desc';
    }

    if (this.data.postType == 3) {
      this.setData({
        pageNumber: this.data.initPageNumber
      });
    }

    console.log(order_by)
    console.log(sort_by)

    _this.setData({
      notDataTips: false
    });

    app.http('get',
      `/post?page_size=${_this.data.pageSize}&page_number=${_this.data.pageNumber}&obj_type=${objType}&type=${_this.data.postType}&order_by=${order_by}&sort_by=${sort_by}`,
      {},
      res => {

        wx.hideLoading();

        _this.setData({
          showGeMoreLoadin: false
        })

        let posts = that.data.posts;

        console.log("post数据：" + posts);

        if(res.data.data){
          console.log('返回的贴子数据');
          console.log(res.data.data.page_data);
          console.log('第几页' + _this.data.pageNumber);

          if (res.data.data.page_data.length > 0) {
            res.data.data.page_data.map(item => {
              posts.push(item);
            });

            _this.setData({
              posts: posts,
              pageNumber: _this.data.pageNumber + 1              
            });
          } else {
            _this.setData({
              notDataTips: true
            });
          }
        }

      });

  },

  /**
   * 预览图片
   */
  previewImage: function (event) {

    console.log(event.target.id);

    let url = event.target.id;

    wx.previewImage({
      current: '',
      urls: [url]
    })
  },

  /**
   * 显示评论控制面板
   */
  showComment: function (event) {

    this.setData({
      show: 0
    });

    let id = event.target.id;
    let hidden = event.target.dataset.show;

    if (!hidden) {
      this.setData({
        show: id,
        hidden: true
      });
    } else {
      this.setData({
        show: 0,
        hidden: false
      });
    }

    console.log(hidden)
    console.log(event)
    console.log(id);

  },

  /**
   * 触摸屏幕后移动触发一些隐藏操作
   */
  hiddenComment: function () {
    console.log('inde-hiddenComment：触摸后移动');
    this.setData({
      show: 0,
      hidden: false,
      showCommentInput: false
    });
  },

  /**
   * 点赞
   */
  praise: function (event) {
    console.log('index-praise：点赞');

    let objId = event.target.dataset.obj;
    let objType = 1;
    console.log(objId);

    this.setData({
      show: 0,
      hidden: false,
      showCommentInput: false
    });

    let _this = this;

    app.http(
      'post',
      `/praise`,
      { obj_id: objId, obj_type: objType }, res => {
        console.log('点赞成功' + res);

        let postList = _this.data.posts;
        let newPostList = postList.map(item => {

          if (objId == item.id) {
            item.praises.push(res.data.data);
          }

          return item;
        });

        //重新赋值，更新数据列表
        _this.setData({
          posts: newPostList
        });

      });

  },

  /**
   * 激活评论框
   */
  showCommentInput: function (event) {
    console.log('index-showCommentInput：激活评论框');

    let objId = event.target.dataset.objid;
    let type = event.target.dataset.objtype;
    console.log('评论对象Id:' + objId)
    console.log('评论类型:' + type)

    this.setData({
      commentObjId: objId,
      commentType: type,
      show: 0,
      hidden: false,
      showCommentInput: true
    });
  },

  /**
   * 获取评论框的输入内容
   */
  getCommentContent: function (event) {
    console.log("评论框输入内容:" + event.detail.value);

    let content = event.detail.value;
    this.setData({
      commentContent: ''
    })

    this.setData({
      commentContent: content
    })
  },

  /**
   * 提交评论
   */
  sendComment: function (e) {

    let _this = this;

    let content = this.data.commentContent;
    let objId = this.data.commentObjId;
    let type = this.data.commentType;
    let refcommentId = this.data.refcommentId;

    console.log("comment:" + content);

    if (content == '') {
      return;
    }

    console.log('objid:' + objId);
    console.log('refcommentid:' + refcommentId);
    console.log('评论的内容:' + content);
    console.log('评论的Id:' + objId);
    console.log('评论的类型:' + type);

    app.http('post', '/comment', {
      content: content,
      obj_id: objId,
      type: type,
      ref_comment_id: refcommentId
    }, function (res) {

      _this.setData({
        commentContent: '',
        commentObjId: '',
        commentType: '',
        showCommentInput: false,
        refcommentId: ''
      })

      console.log('返回的评论内容');
      console.log(res);

      let postList = _this.data.posts;
      let newPostList = postList.map(item => {

        if (objId == item.id) {
          item.comments.push(res.data.data);
        }

        return item;
      });

      //重新赋值，更新数据列表
      _this.setData({
        posts: newPostList
      });


    });

  },

  /**
   * 回复别人
   */
  commentOtherComment: function (e) {

    console.log(e.currentTarget.dataset);
    let objId = e.currentTarget.dataset.objid;
    let type = e.currentTarget.dataset.objtype;
    let refcommentId = e.currentTarget.dataset.refid;

    console.log('评论对象Id:' + objId)
    console.log('评论类型:' + type)

    this.setData({
      commentObjId: objId,
      commentType: type,
      show: 0,
      hidden: false,
      showCommentInput: true,
      refcommentId: refcommentId
    });
  },

  /**
   * 删除评论
   */
  deleteComment: function (e) {
    console.log('删除评论')

    let objId = e.currentTarget.dataset.objid;
    let commentId = e.currentTarget.dataset.refid;
    let _this = this;

    console.log('评论Id：' + commentId);
    console.log('帖子Id' + objId);

    wx.showModal({
      title: '提示',
      content: '确认删除该评论?',
      success: function (res) {
        if (res.confirm) {

          console.log('用户点击确定')

          app.http('delete', `/delete/${commentId}/comment`, {}, res => {

            if (res.data.data == 1) {

              let newPostList = _this.data.posts.map(item => {
                if (objId == item.id) {
                  let newComment = item.comments.filter((item, index) => {
                    if (item.id != commentId) {
                      return item;
                    }
                  });
                  item.comments = newComment;
                }

                return item;
              });

              _this.setData({
                posts: newPostList
              });
            }

          });


        } else if (res.cancel) {
          console.log('用户点击取消')
        }
      }
    })

  },

  /**
   * 删除帖子
   */
  deletePost: function (e) {

    let objId = e.target.id;
    let _this = this;

    console.log('删除贴子的id:' + objId);

    wx.showModal({
      title: '提示',
      content: '确定删除吗?',
      success: function (res) {
        if (res.confirm) {
          console.log('用户点击确定');

          app.http('delete', `/delete/${objId}/post`, {}, res => {

            console.log(res.data);
            let result = res.data.data;

            if (result == 1) {
              console.log('删除成功');

              let newPosts = _this.data.posts.filter((item, index) => {
                if (item.id != objId) {
                  return item;
                }
              });

              _this.setData({
                posts: newPosts
              });

            } else {
              console.log('删除失败');
            }

          });

        } else if (res.cancel) {
          console.log('用户点击取消')
        }
      }
    })
  },

  /**
   * 跳转到私信
   */
  letter: function (e) {
    console.log('跳转到私信');
    console.log(e.target.dataset.obj);

    let id = e.target.dataset.obj;
    let canChat = e.target.dataset.chat;

    wx.navigateTo({
      url: '/pages/letter/letter?friend_id=' + id
    })
  },
  /**
   * 关注
   */
  follow: function (e) {

    console.log(e);

    let _this = this;
    let objId = e.target.dataset.obj;

    console.log(objId);

    app.http('post', '/follow', {
      obj_id: objId,
      obj_type: 1
    }, function (res) {

      console.log(res.data);

      let follow = res.data.data;
      let post = _this.data.posts;

      let newPost = post.map(item => {

        if (item.id == follow.obj_id) {
          item.follow = true;
        }

        return item;
      });

      _this.setData({
        posts: newPost
      });
    });
  },

  /**
   * 取消关注
   */
  cancelFolllow: function (e) {

    let _this = this;
    let objId = e.target.dataset.obj;

    app.http('put', `/cancel/${objId}/follow/1`, {}, function (res) {

      console.log(res.data);

      let follow = res.data.data;
      let post = _this.data.posts;

      let newPost = post.map(item => {
        if (item.id == objId) {
          item.follow = false;
        }
        return item;
      });

      _this.setData({
        posts: newPost
      });
    });

  },
  searchAudit:function(){

    wx.navigateTo({
      url: '/pages/school/school?type=1'
    })

  }

})