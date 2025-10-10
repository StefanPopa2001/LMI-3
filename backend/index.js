const createApp = require('./app');

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  try {
    console.log('🚀 Initializing server...');
    const app = await createApp();
    
    app.listen(PORT, HOST, () => {
      console.log(`✅ Server ready at http://${HOST}:${PORT}`);
      console.log(`📊 GraphQL endpoint: http://${HOST}:${PORT}/graphql`);
      console.log(`🔌 REST API ready at http://${HOST}:${PORT}`);
      console.log(`📝 Health check: http://${HOST}:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
