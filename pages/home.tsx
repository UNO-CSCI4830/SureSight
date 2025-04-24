import Footer from "@/components/layout/Footer";
import NavBar from "@/components/layout/NavBar";

const Home = () => {
  return (
    <div className="w-screen min-h-screen bg-primary" data-theme='night'>
      <NavBar />
      <div className="p-6">
        <p className="text-lg">Page content goes here</p>
        
      </div>
      <div className="justify-end"><Footer /></div>

    </div>
  );
};

export default Home;
