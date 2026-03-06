// client/src/component/AdminForm.js

import React from "react";
import { useForm } from "react-hook-form";
import StartEnd from "./StartEnd";
import ElectionStatus from "./ElectionStatus";

export default function AdminForm(props) {
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm();

  const onSubmit = (data) => {
    props.registerElection(data);
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* This is the main grid container. */}
        <div className="election-details-form">
          {/* Column 1: Admin Details */}
          <div className="form-section">
            <h3>Admin Details</h3>
            <div>
              <label className="form-label">Full Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="Admin's Full Name"
                {...register("adminName", { required: true })}
              />
              {errors.adminName && (
                <span style={{ color: "tomato" }}>This field is required</span>
              )}
            </div>
            <div>
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                {...register("adminEmail", { required: true })}
              />
              {errors.adminEmail && (
                <span style={{ color: "tomato" }}>This field is required</span>
              )}
            </div>
            <div>
              <label className="form-label">Job Title</label>
              <input
                className="form-input"
                type="text"
                placeholder="eg. Election Commissioner"
                {...register("adminTitle", { required: true })}
              />
              {errors.adminTitle && (
                <span style={{ color: "tomato" }}>This field is required</span>
              )}
            </div>
          </div>

          {/* Column 2: Election Details */}
          <div className="form-section">
            <h3>Election Details</h3>
            <div>
              <label className="form-label">Election Title</label>
              <input
                className="form-input"
                type="text"
                placeholder="eg. Student Body Election 2025"
                {...register("electionTitle", { required: true })}
              />
              {errors.electionTitle && (
                <span style={{ color: "tomato" }}>This field is required</span>
              )}
            </div>
            <div>
              <label className="form-label">Organization Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="eg. Central University"
                {...register("organizationTitle", { required: true })}
              />
              {errors.organizationTitle && (
                <span style={{ color: "tomato" }}>This field is required</span>
              )}
            </div>
          </div>
        </div>

        {/* The controls container remains below the form grid */}
        <div className="controls-container">
          <StartEnd
            elStarted={props.elStarted}
            elEnded={props.elEnded}
            endElFn={props.endElFn}
            startElFn={props.startElFn}
          />
          <ElectionStatus elStarted={props.elStarted} elEnded={props.elEnded} />
        </div>
      </form>
    </div>
  );
}
