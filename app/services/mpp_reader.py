import jpype
import jpype.imports
from jpype.types import *
import io
from typing import Dict, Any, List

class MPPReader:
    def __init__(self):
        if not jpype.isJVMStarted():
            jpype.startJVM(classpath=["mpxj-*.jar"])
    
    def parse(self, file_contents: bytes, filename: str) -> Dict[str, Any]:
        """Parse Microsoft Project file and extract data"""
        from net.sf.mpxj.reader import UniversalProjectReader
        
        reader = UniversalProjectReader()
        
        # Create a ByteArrayInputStream from the file contents
        byte_array = jpype.JArray(jpype.JByte)(file_contents)
        input_stream = jpype.java.io.ByteArrayInputStream(byte_array)
        
        project = reader.read(input_stream)
        
        return {
            "project_name": str(project.getProjectProperties().getName() or "Untitled"),
            "start_date": str(project.getProjectProperties().getStartDate()),
            "finish_date": str(project.getProjectProperties().getFinishDate()),
            "tasks": self._extract_tasks(project),
            "resources": self._extract_resources(project)
        }
    
    def _extract_tasks(self, project) -> List[Dict[str, Any]]:
        """Extract task information"""
        tasks = []
        for task in project.getTasks():
            if task.getID() is not None:
                tasks.append({
                    "id": int(task.getID()),
                    "name": str(task.getName() or ""),
                    "duration": str(task.getDuration()),
                    "start": str(task.getStart()),
                    "finish": str(task.getFinish()),
                    "percent_complete": float(task.getPercentageComplete().floatValue()) if task.getPercentageComplete() else 0.0
                })
        return tasks
    
    def _extract_resources(self, project) -> List[Dict[str, Any]]:
        """Extract resource information"""
        resources = []
        for resource in project.getResources():
            if resource.getID() is not None:
                resources.append({
                    "id": int(resource.getID()),
                    "name": str(resource.getName() or ""),
                    "type": str(resource.getType())
                })
        return resources