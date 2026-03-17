const express = require('express');
const router = express.Router();
const protect = require('../middlewares/auth.middleware');
const taskController = require('../controllers/task.controller');
//grouping by functionality
//create
router.post('/', protect, taskController.createTask);
//retrivial/read
router.get('/project/:projectId', protect, taskController.getProjectTasks);
router.get('/:taskId', protect, taskController.getTaskById);
//assign
router.patch('/:taskId/assign', protect, taskController.assignTask);
//update
router.patch('/:taskId/status', protect, taskController.updateTaskStatus); //updatestatus
router.patch('/:taskId', protect, taskController.updateTask);  //update task title, description, etc
//removal
router.delete('/:taskId', protect, taskController.deleteTask);
router.patch('/:taskId/unassign', protect, taskController.unassignTask); 


module.exports = router;