import './ProjectsLightPolish.css';
import React from 'react';
import { useProject } from '../../context/ProjectContext';
import ProjectsMainContent from '../../components/projects/ProjectsMainContent';

export default function ProjectsView() {
    const projectContext = useProject();

    return (
        <div 
            className="content-area flex-1 overflow-y-auto px-8 py-6 bg-slate-50/30 font-inter" 
            id="projectsView" 
            style={{ height: '100%', boxSizing: 'border-box' }}
        >
            <ProjectsMainContent 
                {...projectContext} 
                className="w-full" 
                style={{ height: 'auto', overflowY: 'visible', padding: 0, background: 'transparent' }} 
            />
        </div>
    );
}