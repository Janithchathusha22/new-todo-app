import { useEffect, useState } from 'react';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import './styles/main.css';

// Use the host machine's address when running in browser
const API_URL = 'http://localhost:8080';

function App() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTasks = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/tasks`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('Failed to load tasks. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container">
      <h1>Todo App</h1>
      {error && <div className="error-message">{error}</div>}
      <TaskForm onNewTask={fetchTasks} apiUrl={API_URL} />
      {isLoading ? (
        <div className="loading">Loading tasks...</div>
      ) : (
        <TaskList tasks={tasks} onTaskComplete={fetchTasks} apiUrl={API_URL} />
      )}
    </div>
  );
}

export default App;