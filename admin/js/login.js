/**
 * ============================================================================
 * 文件名：login.js
 * 文件说明：管理员登录页面的逻辑处理
 * ----------------------------------------------------------------------------
 * 这个文件负责处理管理员的登录操作。
 * 当管理员在登录页面输入用户名和密码并点击"登录"按钮时，
 * 这个文件中的代码会：
 *   1. 阻止表单的默认提交行为（防止页面刷新）
 *   2. 获取用户输入的用户名和密码
 *   3. 把用户名和密码发送到后端服务器进行验证
 *   4. 如果验证成功，保存服务器返回的 token（登录令牌），然后跳转到管理首页
 *   5. 如果验证失败，弹出错误提示
 *
 * 什么是"事件监听"？
 *   就像给一个按钮安装了一个"监控器"，当用户做了某个操作（比如点击、提交表单），
 *   监控器就会触发我们预先写好的代码。这里我们监听的是表单的 'submit'（提交）事件。
 *
 * 什么是 e.preventDefault()？
 *   表单默认提交时会刷新整个页面，但我们想用 JavaScript 自己控制提交过程，
 *   所以调用 e.preventDefault() 来"阻止默认行为"，防止页面刷新。
 * ============================================================================
 */

// 获取页面上 id 为 'loginForm' 的表单元素，并给它添加一个"提交"事件的监听器
// 当用户点击登录按钮（或按回车键）提交表单时，下面的箭头函数就会被执行
// async 表示这个函数内部有需要等待的异步操作（网络请求）
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  // 阻止表单的默认提交行为（默认会刷新页面），我们要用 JavaScript 自己处理
  e.preventDefault();

  // 从页面上获取用户输入的用户名和密码
  // document.getElementById('username') 找到 id 为 'username' 的输入框
  // .value 获取输入框中用户输入的文字内容
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    // 使用 fetch() 向后端服务器发送登录请求
    // API_BASE_URL + '/admin/auth/login' 拼接出完整的登录接口地址
    // method: 'POST' 表示这是一个"提交数据"的请求（POST 用于发送数据，GET 用于获取数据）
    // headers 中指定发送的数据格式为 JSON
    // body 中把用户名和密码转换成 JSON 字符串发送给服务器
    const response = await fetch(API_BASE_URL + '/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    // 把服务器返回的响应解析为 JSON 对象
    const data = await response.json();

    // 判断服务器返回的状态码
    if (data.code === 200) {
      // 登录成功！
      // 把服务器返回的 token（登录令牌）保存到浏览器的本地存储中
      // 这样后续的请求就可以带上这个 token 来证明身份
      setToken(data.data.token);

      // 跳转到管理后台的首页（index.html）
      window.location.href = 'index.html';
    } else {
      // 登录失败，弹出服务器返回的错误消息
      // 如果服务器没有返回具体消息，就显示默认的"登录失败"
      alert(data.msg || '登录失败');
    }
  } catch (error) {
    // 如果网络请求本身出错（比如服务器没启动、网络断开等），会进入这里
    // 在浏览器控制台打印错误信息，方便开发者调试
    console.error('登录错误:', error);
    // 弹出提示告诉用户检查网络连接
    alert('登录失败，请检查网络连接');
  }
});
