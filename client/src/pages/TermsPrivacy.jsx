import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";

const TermsPrivacy = () => {
  const [activeTab, setActiveTab] = useState("terms");
  const [accepted, setAccepted] = useState(false);
  const [isCheckboxDisabled, setIsCheckboxDisabled] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCheckboxDisabled(false);
    }, 60000);

    return () => clearTimeout(timer);
  }, []);

  const handleClick = () => {
    navigate("/login");
    toast.success(
      "Terms and Conditions Accepted Now you can login to your account"
    );
  };

  const handleCheckboxClick = () => {
    if (isCheckboxDisabled) {
      toast.error(
        "Please Read the Terms of Service and Privacy Policy Completely before You can proceed"
      );
    } else {
      setAccepted(!accepted);
    }
  };

  return (
    <div className="bg-gray-50 text-gray-800">
      <ToastContainer
        position="top-center" // Positioning it at the top center
        autoClose={3000} // Duration before the toast disappears
        hideProgressBar={false} // Show the progress bar
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        className="dark-toast-container"
      />
      {/* Hero Section */}
      <header className="bg-gray-900 text-white py-16 text-center">
        <h1 className="text-4xl font-bold">
          Terms of Service & Privacy Policy
        </h1>
        <p className="mt-2 text-lg">Last updated: February 10, 2025</p>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row">
        {/* Sidebar Navigation - Shown on Desktop */}
        <aside className="hidden md:block w-1/4 bg-white shadow-md p-6 rounded-lg h-fit sticky top-10">
          <h3 className="text-lg font-semibold mb-4">Jump to Section</h3>
          <ul className="space-y-3">
            <li>
              <button
                className={`w-full text-left p-2 rounded-md ${
                  activeTab === "terms" ? "bg-gray-200" : "hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("terms")}
              >
                Terms of Service
              </button>
            </li>
            <li>
              <button
                className={`w-full text-left p-2 rounded-md ${
                  activeTab === "privacy" ? "bg-gray-200" : "hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("privacy")}
              >
                Privacy Policy
              </button>
            </li>
          </ul>
        </aside>

        {/* Content Section */}
        <main className="md:w-3/4 w-full md:pl-10">
          {/* ✅ Show Conditional Tabs on Desktop */}
          <div className="hidden md:block">
            {activeTab === "terms" ? <TermsOfService /> : <PrivacyPolicy />}
          </div>

          {/* ✅ Show Both Sections on Mobile */}
          <div className="md:hidden">
            <TermsOfService />
            <hr className="mt-4 border-black" />
            <br />
            <PrivacyPolicy />
          </div>

          {/* Acceptance Section */}
          <div className="bg-white shadow-md p-6 mt-10 rounded-lg border">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="acceptTerms"
                className="mr-3 w-5 h-5 cursor-pointer"
                checked={accepted}
                onChange={handleCheckboxClick}
              />
              <label className="text-gray-700 text-lg">
                I have read and agree to the{" "}
                <span
                  className="text-blue-600 cursor-pointer underline"
                  onClick={() => setActiveTab("terms")}
                >
                  Terms of Service
                </span>{" "}
                and{" "}
                <span
                  className="text-blue-600 cursor-pointer underline"
                  onClick={() => setActiveTab("privacy")}
                >
                  Privacy Policy
                </span>
                .
              </label>
            </div>
            <button
              className={`mt-4 w-full py-3 text-white font-semibold rounded-md ${
                accepted
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
              disabled={!accepted}
              onClick={handleClick}
            >
              Continue
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

// ✅ Terms of Service Component
// ✅ Terms of Service Component
const TermsOfService = () => (
  <div>
    <h2 className="text-3xl italic font-[cursive] text-gray-600 font-bold mb-4">
      Terms Of Service for Clients
    </h2>
    <p>
      Welcome to <strong>Renewed Minds Global Consult (RMGC)</strong>. By using
      our website, you agree to comply with the following terms. Please read
      them carefully.
    </p>

    <h2 className="text-xl font-semibold mt-6">1. Use of Our Website</h2>
    <p>
      You agree to use the site for lawful purposes only and in accordance with
      these Terms. You must not misuse the site or engage in activities that
      could disrupt or damage the site’s operations.
    </p>

    <h2 className="text-xl font-semibold mt-6">2. Account Registration</h2>
    <p>
      To access our services, you must create an account with accurate and
      complete information. You are responsible for maintaining the
      confidentiality of your login credentials.
    </p>

    <h2 className="text-xl font-semibold mt-6">3. Services</h2>
    <p>
      We strive to ensure that service information on the site is accurate, but
      we do not guarantee its accuracy. Prices and availability are subject to
      change without notice.
    </p>

    <h2 className="text-xl font-semibold mt-6">4. Communication Policy</h2>
    <p>
      External communication or correspondence with any Service Provider outside
      of RMGC&apos;s website is highly prohibited. We have provided a chat
      platform where each Client can converse effectively with the Service
      Provider. We use the chat platform to track correspondence and ensure that
      Service Providers meet up to their requirements from any client. If found
      that you breach this condition, your account will be deactivated and you
      will no longer have access to the use of RMGC website. We will also not be
      held liable for any loss incurred from the external correspondence.
    </p>

    <h2 className="text-xl font-semibold mt-6">5. Payments and Orders</h2>
    <p>
      All payments must be made through RMGC’s secure payment gateway. We do not
      support direct transactions between users outside our platform.
    </p>

    <h2 className="text-xl font-semibold mt-6">6. Order Fulfilment </h2>
    <p>
      Fulfilment timeline of services should be clearly communicated between you
      and the Service Provider before payment checkout. We are not responsible
      for delays caused by Service Providers in fulfilment of orders.
    </p>

    <h2 className="text-xl font-semibold mt-6">7. Refunds</h2>
    <p>
      Our Refund policy states that when the Service Provider defaults in
      fulfilling your order within the agreed time, you will receive a complete
      refund of the payment made. However, if the order was fulfilled and you
      choose to request a refund. RMGC will investigate the cause of the
      request. If ascertained that the service was not delivered as expected, or
      short of standard; the Service Provider will be mandated to redo the
      service without extra cost to you. Upon investigation that there was no
      default or substandard service from the Service Provider, your request for
      a refund will be declined. You can only initiate a refund request within
      seven (7) working days after order fulfilment.
    </p>

    <h2 className="text-xl font-semibold mt-6">8. Intellectual Property</h2>
    <p>
      All content on the site, including text, images, logos, and trademarks,
      are owned by RMGC or its licensors (including Service Providers) and
      protected by copyright law.
    </p>

    <h2 className="text-xl font-semibold mt-6">9. Limitation of Liability</h2>
    <p>
      RMGC is not liable for any direct or indirect damages arising from the use
      of this platform.
    </p>

    <h2 className="text-xl font-semibold mt-6">10. Governing Law</h2>
    <p>
      These Terms will be governed by and construed in accordance with the laws
      of the Federal Republic of Nigeria.
    </p>

    <h2 className="text-xl font-semibold mt-6">11. Changes to Terms</h2>
    <p>
      We may update these Terms from time to time. Any changes will be posted on
      this page with an updated revision date.
    </p>
    <hr className="border-black mt-4" />
    <br />
    <h2 className="text-3xl italic font-[cursive] text-gray-600 font-bold mb-4">
      Terms Of Service & Condition for Service Providers
    </h2>
    <p>
      These{" "}
      <strong>
        Service Provider Terms and Conditions (&quot;Agreement&quot;)
      </strong>{" "}
      govern the use of{" "}
      <strong>[Renewed Minds Global Consult] (&quot;RMGC&quot;)</strong> by{" "}
      <strong>
        service providers (&quot;Service Providers&quot; or &quot;you&quot;)
      </strong>{" "}
      who wish to list and provide services on <strong>RMGC</strong>. By
      registering as a service provider on RMGC, you agree to comply with the
      terms and conditions outlined below.
    </p>

    <h2 className="text-xl font-semibold mt-6">1. Eligibility</h2>
    <p>
      To provide service on <strong>RMGC</strong>, you must be a legal entity or
      an individual over the age of <strong>18</strong> with the capacity to
      enter into a contract. <strong>Service Providers</strong> must submit
      accurate and complete registration information, including business
      details, contact information, and tax-related information as required.
    </p>

    <h2 className="text-xl font-semibold mt-6">2. Service Listings</h2>
    <p>
      <strong>Service Providers</strong> are responsible for listing their
      services accurately and ensuring that service descriptions, prices, and
      images are correct and up-to-date. Services listed must comply with all
      applicable laws, including but not limited to consumer protection, safety,
      and intellectual property laws. <strong>RMGC</strong> reserves the right
      to remove any service listings that violate its policies or applicable
      laws.
    </p>

    <h2 className="text-xl font-semibold mt-6">3. Fees and Payment</h2>
    <p>
      <strong>Service Providers</strong> will get free registration for this one
      year but will renew their registration for 2026, with{" "}
      <strong>5,000 Naira</strong>. New service providers registering fresh in
      2026 will pay a registration fee of 5,000 Naira before being able to list
      their services on <strong>RMGC</strong>. A total of{" "}
      <strong>10% (ten percent)</strong> will be deducted by{" "}
      <strong>RMGC</strong> from any payment made by a Client to the Service
      Provider which will cover for operational fees. Payment for services will
      be processed through <strong>RMGC</strong> payment gateway directly from
      the client and after the deduction of 10% of the amount received, the
      remaining sum will be disbursed to the <strong>Service Provider</strong>,
      on the condition that the <strong>Service Provider</strong> has fulfilled
      the order and request of the
      <strong>Client</strong>. This is to ensure trust and no breach of service.
    </p>

    <h2 className="text-xl font-semibold mt-6">4. Order Fulfillment</h2>
    <p>
      <strong>Service Providers</strong> are responsible for fulfilling service
      requests in a timely manner and as at when it is agreed between them and{" "}
      <strong>Client</strong> to do so. <strong>Service Providers</strong> must
      provide accurate information of services and reasonable fulfillment
      timeframe details to <strong>Clients</strong> before embarking on a
      service request. <strong>Service Providers</strong> are responsible for
      managing inventory and ensuring that services listed are available for
      request.
    </p>

    <h2 className="text-xl font-semibold mt-6">5. Customer Service</h2>
    <p>
      <strong>Service Providers</strong> are required to provide prompt and
      professional customer service in response to Client&apos;s inquiries,
      complaints, or issues.
      <strong>Service Providers</strong> must handle refunds and complaints in
      accordance with RMGC refund policy.
    </p>

    <h2 className="text-xl font-semibold mt-6">6. Means of Communication </h2>
    <p>
      All correspondence and communication will be done on the website through
      the chat medium between the (Service Provider and Client). Chats backlog
      will be cleared after a period of time, to ensure there is no exchange of
      contacts or communication outside of RMGC website. A breach of this rule
      would result in termination of the Service Provider account, if found.
    </p>

    <h2 className="text-xl font-semibold mt-6">7. Refund Policy</h2>
    <p>
      <strong>Service Providers</strong> must ensure that they deliver excellent
      services to clients to avoid unnecessary issues and complaints. In the
      event that any Client doesn&apos;t appreciate the service gotten from the
      Service Provider and requests a refund or for the service to be done
      again, RMGC will take steps to investigate if the Service Provider
      didn&apos;t deliver as expected, or fault is from client. If the Service
      Provider is the one in the wrong, the Service Provider will refund or redo
      the service requested to the client without any further payment made by
      the client or from RMGC. If the Client doesn&apos;t have valid grounds to
      seek a refund or a replacement of service, RMGC will intervene and remind
      the client of its terms and conditions, which they agreed to before
      signing up.
    </p>

    <h2 className="text-xl font-semibold mt-6">8. Compliance with Laws</h2>
    <p>
      <strong>Service Providers</strong> must comply with all applicable laws,
      including those related to consumer protection, taxes, and intellectual
      property rights.
      <strong>Service Providers</strong> are responsible for obtaining any
      necessary licenses or permits required for their business activities.
    </p>

    <h2 className="text-xl font-semibold mt-6">
      9. Termination of Service Provider Account
    </h2>
    <p>
      RMGC may suspend or terminate a Service Provider&apos;s account at its
      discretion, including for violations of these terms and conditions or any
      illegal activity. <strong>Service Providers</strong> may also terminate
      their accounts at any time by providing notice to RMGC.
    </p>

    <h2 className="text-xl font-semibold mt-6">10. Intellectual Property</h2>
    <p>
      <strong>Service Providers</strong> retain ownership of the intellectual
      property in their service listings, including images and descriptions, but
      grant RMGC a license to use, display, and promote those listings.{" "}
      <strong>Service Providers</strong> must ensure that their listings do not
      infringe on any third-party intellectual property rights.
    </p>

    <h2 className="text-xl font-semibold mt-6">11. Indemnification</h2>
    <p>
      <strong>Service Providers</strong> agree to indemnify and hold RMGC
      harmless from any claims, damages, or expenses arising from the Service
      Provider&apos;s actions, including violations of this Agreement, laws, or
      third-party rights.
    </p>
    <h2 className="text-xl font-semibold mt-6">11. Limitation of Liability</h2>
    <p>
      RMGC is not liable for any loss, damage, or injury arising from the use of
      RMGC, including the sale of services by <strong>Service Providers</strong>
      .
    </p>
    <h2 className="text-xl font-semibold mt-6">11. Amendments</h2>
    <p>
      RMGC may amend these terms and conditions from time to time. Service
      Providers will be notified of any material changes, and continued use of
      RMGC constitutes acceptance of the updated terms.
    </p>
    <h2 className="text-xl font-semibold mt-6">11. Governing Law</h2>
    <p>
      This Agreement will be governed by and construed in accordance with the
      laws of the Federal Republic of Nigeria.
    </p>
  </div>
);

// ✅ Privacy Policy Component
const PrivacyPolicy = () => (
  <div>
    <h2 className="text-3xl italic font-[cursive] text-gray-600 font-bold mb-4">
      Our Privacy Policy
    </h2>
    <p>
      Your privacy is important to us. This policy outlines how we collect, use,
      and protect your personal information.
    </p>

    <h2 className="text-xl font-semibold mt-6">1. Information We Collect</h2>
    <ul className="list-disc pl-5">
      <li>
        Personal Information: When you make a purchase, register, or sign up for
        newsletters, we collect information such as your name, email address,
        phone number and payment details..
      </li>
      <li>
        Usage Information: We collect non-personal information through cookies
        and tracking technologies to understand how users interact with the
        website. Usage Information: We collect non-personal information through
        cookies and tracking technologies to understand how users interact with
        the website. .
      </li>
    </ul>

    <h2 className="text-xl font-semibold mt-6">
      2. How We Use Your Information
    </h2>
    <ul className="list-disc pl-5">
      <li>To process payments and fulfill orders.</li>
      <li>To improve our website’s functionality and customer experience.</li>
      <li>To communicate with you regarding updates and promotions.</li>
    </ul>

    <h2 className="text-xl font-semibold mt-6">3. Data Security</h2>
    <p>
      We use industry-standard security measures to protect your personal
      information during transmission and storage. However, no online
      transaction is 100% secure, and we cannot guarantee the complete security
      of your information.
    </p>

    <h2 className="text-xl font-semibold mt-6">4. Cookies</h2>
    <p>
      We use cookies to enhance user experience, analyze site usage, and provide
      personalized content. You can adjust your browser settings to manage
      cookies.
    </p>

    <h2 className="text-xl font-semibold mt-6">5. Sharing Your Data</h2>
    <p>
      We may share your personal information with third-party{" "}
      <strong>service providers</strong>
      (e.g., payment processors) to fulfill orders. We do not sell or rent your
      personal information to third parties.
    </p>
    <h2 className="text-xl font-semibold mt-6">6. Your Rights</h2>
    <p>
      You have the right to access, update, or delete your personal information
      by contacting us at [support@renewedmindsglobalconsult.com].
    </p>
    <h2 className="text-xl font-semibold mt-6">7. Children’s Privacy</h2>
    <p>
      Our website is not intended for children under the age of 13. We do not
      knowingly collect personal information from minors.
    </p>
    <h2 className="text-xl font-semibold mt-6">8. Changes to Privacy Policy</h2>
    <p>
      We may update this Privacy Policy from time to time. Any changes will be
      posted on this page with an updated revision date.
    </p>
  </div>
);

export default TermsPrivacy;
