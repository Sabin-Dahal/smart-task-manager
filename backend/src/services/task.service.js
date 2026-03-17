const prisma = require("../config/prisma");

const canUserModifyProject = async (userId, projectId) => {  //redundant function
    const project = await prisma.project.findUnique({where: {id: projectId}});
    if (!project) return false;
    const membership = await prisma.projectMember.findUnique({
        where: {userId_projectId: {userId, projectId}}
    });
    return project.ownerId === userId || (membership && membership.role !== "VIEWER");
};

const assertUserHasProjectAccess = async (userId, projectId, minimumRole = "VIEWER") => {
    const project = await prisma.project.findUnique({where: {id: projectId}});
    if (!project) {
        const error = new Error("Project not found");
        error.statusCode = 404;
        throw error;
    }
    if(project.ownerId === userId) return true;
    const membership = await prisma.projectMember.findUnique({
        where: {userId_projectId: {userId, projectId}}
    });
    if (!membership) {
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
    }
    const roles = ["VIEWER", "COLLABORATOR", "CONTRIBUTOR"];
    const userRoleIndex = roles.indexOf(membership.role);
    const requiredRoleIndex = roles.indexOf(minimumRole);
    if (userRoleIndex < requiredRoleIndex) {
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
    }
    return true;
};


const createTask = async (taskData, userId) => {
    const {title, description, deadline, projectId} = taskData;
    await assertUserHasProjectAccess(userId, projectId, "OWNER");

    return await prisma.task.create({
        data: {
            title,
            description: description || null,
            deadline: deadline ? new Date(deadline) : null,
            projectId
        }
    });
};

const assignTask = async (taskId, targetUserId, currentUserId) => {
    const task = await prisma.task.findUnique({
        where: { id: taskId},
        include: {project: true}
    });
    if (!task) {
        const error = new Error("Task not found");
        error.statusCode = 404;
        throw error;
    }
    await assertUserHasProjectAccess(currentUserId, task.projectId, "OWNER");

    const targetUserMembership = await prisma.projectMember.findUnique({
        where: {userId_projectId: {userId: targetUserId, projectId: task.projectId}}
    });
    const isOwner = task.project.ownerId === targetUserId;
    if (!isOwner && (!targetUserMembership||targetUserMembership.role !== "COLLABORATOR")) {
        const error = new Error("Assignee is not part of this project or not a collaborator in this project");
        error.statusCode = 400;
        throw error;
    }
    return await prisma.task.update({
        where: {id: taskId},
        data: {assignedTo: {connect: {id: targetUserId}}}
    });
};
 
const updateTaskStatus = async({taskId, userId, updateData})=>{ 
    const task = await prisma.task.findUnique({
        where: {id: taskId},
        include: {project:true}
    });
    if(!task){
        const error = new Error("Task not found");
        error.statusCode = 404;
        throw error;
    }
    await assertUserHasProjectAccess(userId, task.projectId, "COLLABORATOR");
    const isOwner = task.project.ownerId == userId;
    const isAssigned = task.assignedToId == userId;
    if(!isOwner && !isAssigned){
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
    }
    return await prisma.task.update({
        where: {id: taskId},
        data: {status: updateData}
    });

};

const getProjectTasks = async({projectId, userId})=>{
    await assertUserHasProjectAccess(userId, projectId, "VIEWER");
    return await prisma.task.findMany({
        where: {projectId},
        include: {assignedTo: {select: {name: true, id: true}}},
        orderBy: {createdAt: "desc"}
    });
};

const getTaskById = async({taskId, userId})=>{
    const task = await prisma.task.findUnique({
        where: {id: taskId},
        include: {project:true, assignedTo: {select: {name: true}}}
    });
    if(!task){
        const error = new Error("Task not found");
        error.statusCode = 404;
        throw error;
    }
    await assertUserHasProjectAccess(userId, task.projectId, "VIEWER");
    return task;
}

const deleteTask = async({taskId, userId}) =>{
    const task = await prisma.task.findUnique({
        where: {id: taskId}});
    if(!task){
        const error = new Error("Task not found");
        error.statusCode = 404;
        throw error;
    }
    await assertUserHasProjectAccess(userId, task.projectId, "OWNER");
    return await prisma.task.delete({
        where: {id: taskId}
    });
};

const unassignTask = async({taskId, adminId}) =>{
    const task = await prisma.task.findUnique({
        where: {id: taskId}
    });
    if(!task){
        const error = new Error("Task not found");
        error.statusCode = 404;
        throw error;
    }
    await assertUserHasProjectAccess(adminId, task.projectId, "OWNER");

    return await prisma.task.update({
        where: {id: taskId},
        data: {assignedToId: null}
     });
};

const updateTask = async({taskId, userId, updateData}) =>{
    const task = await prisma.task.findUnique({
        where: {id: taskId}});
    if(!task){
        const error = new Error("Task not found");
        error.statusCode = 404;
        throw error;
    }
    await assertUserHasProjectAccess(userId, task.projectId, "COLLABORATOR");
    const {title, description, deadline} = updateData;
    return await prisma.task.update({
        where: {id: taskId},
        data: {
            title: title ?? task.title,
            description: description ?? task.description,
            deadline: deadline ? new Date(deadline) : task.deadline
        }
     });
};
module.exports = {createTask, assignTask, updateTaskStatus, getProjectTasks, getTaskById, deleteTask, assertUserHasProjectAccess, unassignTask, updateTask};










// const prisma = require("../config/prisma");
// const canUserModifyProject = async (userId, projectId) => {
//   const project = await prisma.project.findUnique({ where: { id: projectId } });
//   if (!project) return false;

//   const membership = await prisma.projectMember.findUnique({
//     where: { userId_projectId: { userId, projectId } }
//   });

//   return project.ownerId === userId || (membership && membership.role !== "VIEWER");
// };
// const createTask = async(req, res) =>{
//     try{
//         const {title, description, deadline, projectId} = req.body;

//         if (!(await canUserModifyProject(req.user.id, project.id))) {
//             return res.status(403).json({ message: "Forbidden" });
//         }
//         const task = await prisma.task.create({
//             data: {
//                 title,
//                 description: description || null,
//                 deadline: deadline ? new Date(deadline) : null,
//                 projectId
//             }
//         });
//         res.status(201).json({message: "Task created", task});
//     }catch(error){
//         res.status(500).json({error: error.message});
//     }
// };
// const assignTask = async(req, res) =>{
//     try{
//         const {taskId, userId} = req.body;
//         const task = await prisma.task.findUnique({
//             where: {id: taskId},
//             include: {project: true}
//         });
//         if (!task) return res.status(404).json({ message: "Task not found" });
//         const project = task.project;
//         if (!(await canUserModifyProject(req.user.id, project.id))) {
//             return res.status(403).json({ message: "Forbidden" });
//         }
//         const assigneeMembership = await prisma.projectMember.findUnique({
//             where: { userId_projectId: { userId, projectId: project.id } }
//         });

//         if (!(project.ownerId === userId || assigneeMembership)) {
//             return res.status(400).json({ message: "Assignee is not part of this project" });
//         }
//         const updateTask = await prisma.task.update({
//             where: {id: taskId},
//             data: {
//                 assignedTo: {connect: {id: userId}}
//             }
//         });
//         res.json({message: "Task assigned", task: updateTask});
//     }catch(error){
//         res.status(500).json({error: error.message});
//     }
// };



// module.exports = {createTask, assignTask};