import React from 'react';
import ReportsList from '../components/reports/ReportsList';

interface Props {
  projectId: number;
}

const ReportsTab: React.FC<Props> = ({ projectId }) => <ReportsList projectId={projectId} />;

export default ReportsTab;
