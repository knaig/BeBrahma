'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import TaskCard from './TaskCard';
import { useKanbanBoard } from '../../hooks/useKanbanBoard';

interface KanbanBoardProps {
  boardId: string;
  projectId: string;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ boardId, projectId }) => {
  const { tasks, loading, error, updateTaskStatus, reorderTasks } = useKanbanBoard(boardId);
  const [columns, setColumns] = useState({
    TODO: { title: 'To Do', tasks: [] },
    IN_PROGRESS: { title: 'In Progress', tasks: [] },
    IN_REVIEW: { title: 'In Review', tasks: [] },
    DONE: { title: 'Done', tasks: [] },
    BLOCKED: { title: 'Blocked', tasks: [] },
  });

  useEffect(() => {
    if (tasks) {
      const newColumns = { ...columns };
      Object.keys(newColumns).forEach(status => {
        newColumns[status].tasks = tasks.filter(task => task.status === status);
      });
      setColumns(newColumns);
    }
  }, [tasks]);

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) {
      // Same column reordering
      const column = columns[source.droppableId];
      const newTasks = Array.from(column.tasks);
      const [removed] = newTasks.splice(source.index, 1);
      newTasks.splice(destination.index, 0, removed);
      
      setColumns({
        ...columns,
        [source.droppableId]: { ...column, tasks: newTasks }
      });
      
      await reorderTasks(newTasks.map((task, index) => ({
        id: task.id,
        position: index,
        status: source.droppableId
      })));
    } else {
      // Moving between columns
      const sourceColumn = columns[source.droppableId];
      const destColumn = columns[destination.droppableId];
      const sourceTasks = Array.from(sourceColumn.tasks);
      const destTasks = Array.from(destColumn.tasks);
      const [moved] = sourceTasks.splice(source.index, 1);
      
      const updatedTask = { ...moved, status: destination.droppableId };
      destTasks.splice(destination.index, 0, updatedTask);
      
      setColumns({
        ...columns,
        [source.droppableId]: { ...sourceColumn, tasks: sourceTasks },
        [destination.droppableId]: { ...destColumn, tasks: destTasks }
      });
      
      await updateTaskStatus(moved.id, destination.droppableId);
    }
  };

  if (loading) return <div className="flex justify-center p-8">Loading board...</div>;
  if (error) return <div className="text-red-500 p-8">Error: {error}</div>;

  return (
    <div className="h-full overflow-x-auto">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 p-4 min-w-max">
          {Object.entries(columns).map(([status, column]) => (
            <div key={status} className="flex-shrink-0 w-80">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-4 flex items-center justify-between">
                  {column.title}
                  <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-sm">
                    {column.tasks.length}
                  </span>
                </h3>
                
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[200px] transition-colors ${
                        snapshot.isDraggingOver ? 'bg-blue-50' : ''
                      }`}
                    >
                      {column.tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`mb-3 ${
                                snapshot.isDragging ? 'opacity-75' : ''
                              }`}
                            >
                              <TaskCard task={task} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default KanbanBoard;
