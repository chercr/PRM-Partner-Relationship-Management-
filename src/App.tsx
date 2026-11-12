import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Partners from './pages/Partners';
import PartnerDetail from './pages/PartnerDetail';
import Followups from './pages/Followups';
import Analytics from './pages/Analytics';
import Playbook from './pages/Playbook';
import Settings from './pages/Settings';
import Opportunities from './pages/Opportunities';
import Contacts from './pages/Contacts';

export default function App() {
  return <Routes>
    <Route element={<Layout />}>
      <Route index element={<Dashboard />} />
      <Route path="partners" element={<Partners />} />
      <Route path="contacts" element={<Contacts />} />
      <Route path="partners/:id" element={<PartnerDetail />} />
      <Route path="followups" element={<Followups />} />
      <Route path="opportunities" element={<Opportunities />} />
      <Route path="analytics" element={<Analytics />} />
      <Route path="playbook" element={<Playbook />} />
      <Route path="settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>;
}
