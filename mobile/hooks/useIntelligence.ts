import { useMemo } from 'react';
import { ProcessedFile, UnreadEmail, FileCategory } from '../types';

export type UrgencyStatus = 'normal' | 'warning' | 'urgent';

export interface IntelligenceState {
  status: UrgencyStatus;
  recap: string;
  urgentCount: number;
  upcomingMeetings: number;
  isServerSync?: boolean;
}

export const useIntelligence = (
  files: ProcessedFile[], 
  unreadEmails: UnreadEmail[],
  serverBriefing?: string
): IntelligenceState => {
  return useMemo(() => {
    // Safety check for empty data
    const safeFiles = files || [];
    const safeEmails = unreadEmails || [];

    // 1. Detect Overdue/Critical items in files
    const overdueInvoices = safeFiles.filter(f => 
      f.category === FileCategory.Finance && 
      (f.filename.toLowerCase().includes('invoice') || f.filename.toLowerCase().includes('bill'))
    ).length;

    // 2. Detect Urgent Emails
    const urgentEmails = safeEmails.filter(e => {
      const text = ((e.subject || '') + ' ' + (e.snippet || '')).toLowerCase();
      return text.includes('urgent') || text.includes('important') || text.includes('asap') || text.includes('overdue');
    }).length;

    // 3. Detect Meetings
    const meetings = safeEmails.filter(e => {
        const text = ((e.subject || '') + ' ' + (e.snippet || '')).toLowerCase();
        return text.includes('meeting') || text.includes('zoom') || text.includes('calendar') || text.includes('interview');
    }).length;

    // Logic for status
    let status: UrgencyStatus = 'normal';
    if (overdueInvoices > 0 || urgentEmails > 0) {
      status = 'urgent';
    } else if (meetings > 0) {
      status = 'warning';
    }

    // Natural Language Recap (Priority: Server > Local)
    let recap = serverBriefing || "Everything looks organized today.";
    
    if (!serverBriefing) {
        if (overdueInvoices > 0 || urgentEmails > 0) {
          recap = `You have ${overdueInvoices + urgentEmails} items requiring immediate action.`;
        } else if (meetings > 0) {
          recap = `You have ${meetings} upcoming discussions scheduled soon.`;
        }
    }

    return {
      status,
      recap,
      urgentCount: overdueInvoices + urgentEmails,
      upcomingMeetings: meetings,
      isServerSync: !!serverBriefing
    };
  }, [files, unreadEmails, serverBriefing]);
};
