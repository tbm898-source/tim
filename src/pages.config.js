import SETH from './pages/SETH';
import Dashboard from './pages/Dashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "SETH": SETH,
    "Dashboard": Dashboard,
}

export const pagesConfig = {
    mainPage: "SETH",
    Pages: PAGES,
    Layout: __Layout,
};