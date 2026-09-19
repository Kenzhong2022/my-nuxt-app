export default defineNuxtPlugin(() => {
  const { connect } = useSocket();

  // 应用启动后自动连接
  // 若需要登录后再连接，把这行注释掉，在登录成功回调里调用 useSocket().connect()
  connect();

  return {
    provide: {
      connectSocket: connect,
    },
  };
});
