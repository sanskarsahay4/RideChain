import express from 'express';
import routes from './routes.js'; // note .js extension

const app = express();

app.use(express.json());
app.use('/api', routes);

export default app;  // <-- THIS is the default export
