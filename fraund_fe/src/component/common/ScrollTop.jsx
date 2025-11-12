import { useEffect, useState, useRef } from "react";
// import { loadLottieAnimation } from "../../utils/notifyJson/loadLottieAnimation.js";
// import { useSelector } from 'react-redux';
// import {
//   isActiveLink,
// } from "../../utils/linkActiveChecker";
// import Modal from './ModalRecommend.jsx';
const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  // const role = useSelector(state => state.auth.role);
  // const job_suggestion = useRef(null);
  // const isLogin = useSelector(state => state.auth.isLogin);
  // const location = useSelector(state => state.auth.location);
  // const [isModalOpen, setIsModalOpen] = useState(false);
  // const openModal = () => {
  //   setIsModalOpen(true);
  // };

  // const closeModal = () => {
  //   setIsModalOpen(false);
  // };
  
  //kiểu di chuyển scroll chầm chậm là smooth và nhanh là auto còn instant là nhảy
  // useEffect(() => {
  //   if (job_suggestion.current) {
  //     job_suggestion.current.innerHTML = "";
  //     loadLottieAnimation(job_suggestion, "jobSuggestion");
  //   }
  // }, [location, isLogin, role, isModalOpen]);
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    // Button is displayed after scrolling for 500 pixels
    const toggleVisibility = () => {
      if (window.pageYOffset > 500) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };
    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  return (
    <>
      {isVisible && (
        <>
          <div className="scroll-to-top scroll-to-target" onClick={scrollToTop}>
            <span className="fa fa-angle-up"></span>
          </div>
        </>
      )}
      {/* {
        isLogin && role?.toLowerCase() === "student" && isActiveLink("/job", location) && !isModalOpen ?
          <div className={`scroll-to-top1 `}>
            <div onClick={openModal} ref={job_suggestion} style={{ width: '100%', height: '100%' }}>
            </div>
          </div>
          : ""
      } */}
      {/* <div className="flex justify-center items-center">
        <Modal isOpen={isModalOpen} onClose={closeModal} />
      </div> */}
      
    </>

  );
}
export default ScrollToTop;
