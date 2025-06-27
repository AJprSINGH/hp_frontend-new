// app/Maindashboard/page.tsx

import MainScreen from "../content/Dashboard/MainScreen";
import Header from '../../components/Header/Header'
import '../globals.css'

export default function DashboardPage() {
  return (
    <>
      <Header />
      <div className="contentDiv w-full max-w-[1445px] max-md:max-w-full">
        <div className="mainDiv">
          <main style={{ padding: '1rem' }}>
            <MainScreen />
          </main>
        </div>
      </div>
    </>
  );
}
