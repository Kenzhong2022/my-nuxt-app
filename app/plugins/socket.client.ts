export default defineNuxtPlugin(() => {
  const { connect } = useSocket();

  // 应用启动后自动连接
  // 暂时停用：本地 socket 服务端已删除，待外部 socket 服务确定后再启用
  // （启用前记得同步确认 socketUrl 指向新服务）
  // connect();

  return {
    provide: {
      connectSocket: connect,
    },
  };
});
