import React, { useState } from 'react';

export default function TaskList({ tasks, onTaskComplete, apiUrl }) {
    const [completingTasks, setCompletingTasks] = useState(new Set());

    const handleComplete = async (taskId) => {
        try {
            setCompletingTasks(prev => new Set([...prev, taskId]));
            
            const response = await fetch(`${apiUrl}/tasks/${taskId}/complete`, {
                method: 'PATCH', // Changed from PUT to PATCH
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                onTaskComplete(); // Refresh the task list
                alert('Task completed successfully!');
            }
        } catch (error) {
            console.error('Error completing task:', error);
            alert('Failed to complete task. Please try again.');
        } finally {
            setCompletingTasks(prev => {
                const newSet = new Set(prev);
                newSet.delete(taskId);
                return newSet;
            });
        }
    };

    return (
        <div className="task-list">
            {tasks.length === 0 ? (
                <div className="no-tasks">No tasks yet. Add one above!</div>
            ) : (
                tasks.map((task) => (
                    <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                        <div>
                            <h3>{task.title}</h3>
                            {task.description && <p>{task.description}</p>}
                        </div>
                        {!task.completed && (
                            <button 
                                onClick={() => handleComplete(task.id)}
                                className="complete-button"
                                disabled={completingTasks.has(task.id)}
                            >
                                {completingTasks.has(task.id) ? 'Completing...' : 'Done'}
                            </button>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}