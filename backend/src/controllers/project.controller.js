const projectService = require('../services/project.service');

const createProject = async (req, res) => {
    try {
        const project = await projectService.createProject(req.body, req.user.id);
        res.status(201).json({ message: "Project created", project });
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message });    }
};

const getProjects = async (req, res) => {
    try {
        const projects = await projectService.getProjects(req.user.id);
        res.json(projects);
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
};

const addMember = async (req, res) => {
    try {
        const { projectId, email } = req.body;
        const member = await projectService.addMember(projectId, email, req.user.id);
        res.json({ message: "Member added", member });
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
};

const removeMember = async (req, res) => {
    try{
        const { projectId, userId: targetUserId } = req.params;
        const requestUserId = req.user.id;
        await projectService.removeMember({projectId, targetUserId, requestUserId});
        res.json({message: "Member removed"});
    } catch(error){
        res.status(error.statusCode || 500).json({ error: error.message });
    }
};

const deleteProject = async(req, res) =>{
    try{
        const{projectId} = req.params;
        const userId = req.user.id;
        await projectService.deleteProject({projectId, userId});
        res.json({message: `Project ${projectId} deleted`});
    }catch(error){
        res.status(error.statusCode || 500).json({ error: error.message });
    }
};
module.exports = { createProject, getProjects, addMember, removeMember, deleteProject };