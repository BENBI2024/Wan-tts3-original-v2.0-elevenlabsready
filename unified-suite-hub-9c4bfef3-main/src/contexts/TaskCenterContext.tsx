import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export type TaskStatus = 'generating' | 'completed' | 'failed';
export type TaskType = 'tiktok-insights' | 'digital-human' | 'other';

export interface GlobalTask {
  id: string;
  type: TaskType;
  name: string;
  description: string;
  createdAt: Date;
  status: TaskStatus;
  resultRoute?: string;
}

interface TaskCenterContextType {
  tasks: GlobalTask[];
  isDrawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  addTask: (task: Omit<GlobalTask, 'id' | 'createdAt' | 'status'>) => string;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  clearCompletedTasks: () => void;
  getTasksByType: (type: TaskType | 'all') => GlobalTask[];
}

const TaskCenterContext = createContext<TaskCenterContextType | undefined>(undefined);

export function TaskCenterProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<GlobalTask[]>([]);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  // Simulate async task completion
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(prev => prev.map(task => {
        if (task.status === 'generating') {
          const elapsed = Date.now() - task.createdAt.getTime();
          // Complete after 5-10 seconds randomly
          if (elapsed > 5000 + Math.random() * 5000) {
            return { ...task, status: 'completed' as TaskStatus };
          }
        }
        return task;
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const addTask = useCallback((taskData: Omit<GlobalTask, 'id' | 'createdAt' | 'status'>) => {
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTask: GlobalTask = {
      ...taskData,
      id,
      createdAt: new Date(),
      status: 'generating',
    };
    setTasks(prev => [newTask, ...prev]);
    return id;
  }, []);

  const updateTaskStatus = useCallback((id: string, status: TaskStatus) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, status } : task
    ));
  }, []);

  const clearCompletedTasks = useCallback(() => {
    setTasks(prev => prev.filter(task => task.status !== 'completed'));
  }, []);

  const getTasksByType = useCallback((type: TaskType | 'all') => {
    if (type === 'all') return tasks;
    return tasks.filter(task => task.type === type);
  }, [tasks]);

  return (
    <TaskCenterContext.Provider value={{
      tasks,
      isDrawerOpen,
      setDrawerOpen,
      addTask,
      updateTaskStatus,
      clearCompletedTasks,
      getTasksByType,
    }}>
      {children}
    </TaskCenterContext.Provider>
  );
}

export function useTaskCenter() {
  const context = useContext(TaskCenterContext);
  if (!context) {
    throw new Error('useTaskCenter must be used within a TaskCenterProvider');
  }
  return context;
}
