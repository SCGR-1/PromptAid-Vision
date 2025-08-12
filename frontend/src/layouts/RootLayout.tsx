import { Outlet } from 'react-router-dom';
import HeaderNav from '../components/HeaderNav';

export default function RootLayout() {
  return (
    <>
      <HeaderNav />
      <Outlet />
    </>
  );
}