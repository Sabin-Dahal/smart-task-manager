const prisma = require('../config/prisma');
const {assertUserHasProjectAccess} = require('./task.service');
const createProject = async(projectData, ownerId) =>{
    return await prisma.project.create({
        data:{
            ...projectData, 
            ownerId: ownerId
        }
    });
};

const getProjects = async(userId) =>{
    return await prisma.project.findMany({
        where:{
            OR:[
                {ownerId: userId},
                {members: {some: {userId: userId}}}
            ]
        },
        include: {
            owner: {select: {name:true}},
            members: {select: {user: {select: {name:true}}}}
        }
    });
};
    

const addMember = async(projectId, email, currentUserId) =>{
    const project = await prisma.project.findUnique({where: {id: projectId}});
    if (!project) {
        const error = new Error ("Project not found");
        error.statusCode = 404;
        throw error;
    }
    if (project.ownerId !== currentUserId) {
        const error = new Error ("Only project owner can add members");
        error.statusCode = 403;
        throw error;
    }
    const user = await prisma.user.findUnique({where: {email}});
    if (!user) {
        const error = new Error ("User not found");
        error.statusCode = 404;
        throw error;
    }
    if (user.id === currentUserId) {
        const error = new Error ("Project owner is already a member");
        error.statusCode = 400;
        throw error;
    }
    const existingMembership = await prisma.projectMember.findUnique({
        where: {userId_projectId: {userId: user.id, projectId}}
    });
    if(existingMembership){
        const error = new Error ("User is already a member of the project");
        error.statusCode = 400;
        throw error;
    }
    return await prisma.projectMember.create({
        data: {
            userId:user.id,
            projectId,
            role: "COLLABORATOR"
        }
    });
};

const removeMember = async ({projectId, targetUserId, requestUserId}) =>{
    const project = await prisma.project.findUnique({where: {id: projectId}});
    if (!project) {
        const error = new Error ("Project not found");
        error.statusCode = 404;
        throw error;
    }
    const membership = await prisma.projectMember.findUnique({
        where: {userId_projectId: {userId: targetUserId, projectId}}
    });
    if(!membership){
        const error = new Error ("User is not a member of the project");
        error.statusCode = 404;
        throw error;
    }
    await assertUserHasProjectAccess(requestUserId, projectId, "OWNER");
    if(project.ownerId === targetUserId){
        const error = new Error ("Project owner cannot be removed");
        error.statusCode = 400;
        throw error;
    }
    await prisma.task.updateMany({
        where: {projectId, assignedToId: targetUserId},
        data: {assignedToId: null}
     });
    return await prisma.projectMember.delete({
        where: {userId_projectId: {userId: targetUserId, projectId}}
    });
};

const deleteProject = async({projectId, userId}) =>{
    const project = await prisma.project.findUnique({where: {id: projectId}});
    if (!project) {
        const error = new Error ("Project not found");
        error.statusCode = 404;
        throw error;
    }
    if (project.ownerId !== userId) {
        const error = new Error ("Only project owner can delete the project");
        error.statusCode = 403;
        throw error;
    }
    return await prisma.$transaction([  //using transaction to ensure all related data is deleted together
        prisma.task.deleteMany({where: {projectId}}),
        prisma.projectMember.deleteMany({where: {projectId}}),
        prisma.project.delete({where: {id: projectId}})
    ]);
    
};
module.exports = {createProject, getProjects, addMember, removeMember, deleteProject};