/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AIContentGenerator from './pages/AIContentGenerator';
import Achievements from './pages/Achievements';
import AssetManagement from './pages/AssetManagement';
import AssetScanner from './pages/AssetScanner';
import CourseGenerator from './pages/CourseGenerator';
import Dashboard from './pages/Dashboard';
import InstructorAnalytics from './pages/InstructorAnalytics';
import InstructorFeedbackAssistant from './pages/InstructorFeedbackAssistant';
import InstructorGrading from './pages/InstructorGrading';
import IntegrityMonitoring from './pages/IntegrityMonitoring';
import LearningPathwayGenerator from './pages/LearningPathwayGenerator';
import MaintenanceTaskDetail from './pages/MaintenanceTaskDetail';
import MyLearningPath from './pages/MyLearningPath';
import PrivacyNotice from './pages/PrivacyNotice';
import SETH from './pages/SETH';
import StudentProgressTracker from './pages/StudentProgressTracker';
import StudentSubmissions from './pages/StudentSubmissions';
import StudyAssistant from './pages/StudyAssistant';
import TalentInsights from './pages/TalentInsights';
import UserSettings from './pages/UserSettings';
import WhistleblowerReview from './pages/WhistleblowerReview';
import WhistleblowerSubmit from './pages/WhistleblowerSubmit';
import AdminSeedPilotData from './pages/AdminSeedPilotData';
import Devices from './pages/Devices';
import AssetDetail from './pages/AssetDetail';
import AssetForm from './pages/AssetForm';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIContentGenerator": AIContentGenerator,
    "Achievements": Achievements,
    "AssetManagement": AssetManagement,
    "AssetScanner": AssetScanner,
    "CourseGenerator": CourseGenerator,
    "Dashboard": Dashboard,
    "InstructorAnalytics": InstructorAnalytics,
    "InstructorFeedbackAssistant": InstructorFeedbackAssistant,
    "InstructorGrading": InstructorGrading,
    "IntegrityMonitoring": IntegrityMonitoring,
    "LearningPathwayGenerator": LearningPathwayGenerator,
    "MaintenanceTaskDetail": MaintenanceTaskDetail,
    "MyLearningPath": MyLearningPath,
    "PrivacyNotice": PrivacyNotice,
    "SETH": SETH,
    "StudentProgressTracker": StudentProgressTracker,
    "StudentSubmissions": StudentSubmissions,
    "StudyAssistant": StudyAssistant,
    "TalentInsights": TalentInsights,
    "UserSettings": UserSettings,
    "WhistleblowerReview": WhistleblowerReview,
    "WhistleblowerSubmit": WhistleblowerSubmit,
    "AdminSeedPilotData": AdminSeedPilotData,
    "Devices": Devices,
    "AssetDetail": AssetDetail,
    "AssetForm": AssetForm,
}

export const pagesConfig = {
    mainPage: "SETH",
    Pages: PAGES,
    Layout: __Layout,
};