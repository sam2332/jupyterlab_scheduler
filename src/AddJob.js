import { ReactWidget } from "@jupyterlab/apputils";
import { requestAPI } from "./api";
import cronParser from "cron-parser";

import React from "react";

class Component extends React.Component {
  constructor() {
    super();

    this.state = {
      schedule: "",
      preset_schedule:'',
      err: "",
      schedule_examples: [],
      is_schedule_valid: null,
      is_warning_visible:false,
      is_submit_successful: null,
      submitted: false,
      run_evironment: "",
      command: "",
      possible_environments: [],
    };

    this.runEnvironmentChange = this.runEnvironmentChange.bind(this);
    this.commandChange = this.commandChange.bind(this);
    this.scheduleChange = this.scheduleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.runSchedulePresetChange = this.runSchedulePresetChange.bind(this)
  }

  componentDidMount() {
    // Force the DOM 'change' event on the select field so that the
    // runEnvironmentChange function is called, updating the command field
    this.triggerInitialEnvSelection();
  }

  triggerInitialEnvSelection() {
    const input = document.getElementById("run_environment");
    const event = new Event("change", { bubbles: true });
    input.dispatchEvent(event);
  }

  runSchedulePresetChange(event) {
    if (event.target.name === "change_schedule_preset") {
      const schedule_raw = event.target.value;

      let schedule = schedule_raw;
      if (schedule_raw=='custom'){
        schedule = "* * * * *"
      }

      try {
        let examples = [];

        var interval = cronParser.parseExpression(schedule);

        for (let i = 0; i < 5; i++) {
          examples.push(interval.next().toString());
        }
        this.setState({
          schedule: schedule,
          preset_schedule:schedule_raw,
          schedule_examples: examples,
          err: null,
          is_schedule_valid: true,
        });
      } catch (err) {
        this.setState({
          schedule: schedule,
          preset_schedule:schedule_raw,
          err: err.toString(), 
          is_schedule_valid: false,
        });
      }
    }
    return false
  }

  scheduleChange(event) {
    if (event.target.name === "schedule") {
      const schedule = event.target.value;

      // Try to display some examples of the next runs
      try {
        let examples = [];

        var interval = cronParser.parseExpression(schedule);

        for (let i = 0; i < 5; i++) {
          examples.push(interval.next().toString());
        }

        this.setState({
          schedule: schedule,
          schedule_examples: examples,
          err: null,
          is_schedule_valid: true,
          is_warning_visible:false,
        });

        // Don't actually care if we can't generate example cron runs....
      } catch (err) {

        this.setState({
          schedule: schedule,
          err: err.toString(),
          is_schedule_valid: false,
          is_warning_visible:schedule ==''?false:true,
        });
      }
    }
  }
  getEnvironment(path) {
    if (path.endsWith(".py")) {
      return [
        { value: "python", title: "Python" },
        { value: "python3", title: "Python3" },
        { value: "custom", title: "Custom" },
        { value: "bash", title: "Bash" },
      ];
    }
    if (path.endsWith(".ipynb")) {
      return [
        { value: "nbRunner", title: "Run via nbRunner" },
        { value: "papermill", title: "Run via Papermill" },
        { value: "custom", title: "Custom" },
      ];
    }
    if (path.endsWith(".pipeline")) {
      return [
        { value: "elyra", title: "Elyra Local Pipeline" },
        { value: "custom", title: "Custom" },
      ];
    }
    return [
      { value: "bash", title: "Bash" },
      { value: "custom", title: "Custom" },
    ];
  }

  runEnvironmentChange(event) {
    if (event.target.name === "run_environment") {
      
      let runEnvironment = event.target.value;
      let possibleEnvironment = this.getEnvironment(this.props.script_path);
      if (event.target.value == "") {
        runEnvironment = possibleEnvironment[0];
      }

      let updatedCommand = "";

      switch (runEnvironment) {
        case "bash":
          updatedCommand = `bash ${this.props.script_path}`;
          break;
        case "python":
          updatedCommand = `python ${this.props.script_path}`;
          break;
        case "papermill":
          updatedCommand = `papermill ${this.props.script_path} /dev/null`;
          break;
        case "custom":
          updatedCommand = `[CUSTOM_RUN_ENVIRONMENT_GOES_HERE] ${this.props.script_path}`;
          break;
        case "elyra":
          updatedCommand = ` elyra-pipeline run ${this.props.script_path}`;
          break;
        case "nbRunner":
          updatedCommand = `nbRunner ${this.props.script_path}`;
          break;
        default:
          updatedCommand = `bash ${this.props.script_path}`;
      }

      this.setState({
        run_evironment: runEnvironment,
        possible_environments: possibleEnvironment,
        command: updatedCommand,
      });
    }
  }
  commandChange(event) {
    if (event.target.name === "command") {
      const command = event.target.value;
      this.setState({
        command,
      });
    }
  }

  handleSubmit(event) {
    event.preventDefault();
    this.setState({ submitted: true });
    this.addJob(this.state.schedule, this.props.script, this.state.command);
  }

  async addJob(schedule, script, command) {
    const dataToSend = {
      script,
      schedule,
      command,
    };

    try {
      const reply = await requestAPI("add", {
        body: JSON.stringify(dataToSend),
        method: "POST",
      });

      this.setState({
        is_submit_successful: true,
      });
    } catch (reason) {
      console.error(`Error sending delete: ${reason}`);

      this.setState({
        is_submit_successful: false,
      });
    }
  }

  render() {
    const submissionStatus = this.state.is_submit_successful ? (
      <span style={{ marginLeft: "5px", color: "green" }}>
        Crontab Entry created successfully!
      </span>
    ) : (
      <span style={{ marginLeft: "5px", color: "red" }}>
        There was an error creating CronTab Entry!
      </span>
    );

    return (
      <form onSubmit={this.handleSubmit}>
        <div
          style={{
            display: "flex",
            alignContent: "flex-start",
            flexDirection: "column",
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "row", padding: "10px" }}
          >
            <div style={{ minWidth: "120px" }}>Run Environment:</div>

            <div>
              <select
                id="run_environment"
                value={this.state.run_evironment}
                name="run_environment"
                onChange={this.runEnvironmentChange}
              >
                <option value="">Please select an Environment</option>
                {this.state.possible_environments.map((item, i) => (
                  <option value={item['value']} key={i}>
                    {item["title"]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div
            style={{ display: "flex", flexDirection: "row", padding: "10px" }}
          >
            <div style={{ minWidth: "120px" }}>Command:</div>
            <div>
              {this.state.run_evironment === "custom" ? (
                <textarea
                  style={{ width: "500px", height: "50px" }}
                  type="text"
                  name="command"
                  value={this.state.command}
                  onChange={this.commandChange}
                />
              ) : (
                <textarea
                  style={{ width: "500px", height: "50px" }}
                  type="text"
                  name="command"
                  value={this.state.command}
                  readOnly
                  disabled
                />
              )}
            </div>
          </div>

          <div
            style={{ display: "flex", flexDirection: "col", padding: "10px" }}
          >
            <div style={{ minWidth: "120px" }}>Cron Schedule:</div>
          
            <select
              id="preset_schedules"
              name="change_schedule_preset"
              onChange={this.runSchedulePresetChange}
            >
              <option value="" selected disabled>Choose Schedule</option>
              <option value="* * * * *">Every minute</option>
              <option value="*/5 * * * *">Every 5 Minutes</option>
              <option value="*/10 * * * *">Every 10 Minutes</option>
              <option value="*/15 * * * *">Every 15 Minutes</option>
              <option value="*/30 * * * *">Every 30 Minutes</option>
              <option value="0 * * * *">Every Hour</option>
              <option value="0 */3 * * *">Every 3 Hours</option>
              <option value="0 */6 * * *">Every 6 Hours</option>
              <option value="0 */12 * * *">Every 12 Hours</option>
              <option value="0 0 * * *">Midnight</option>
              <option value="0 0 * * SUN">Midnight Sunday</option>
              <option value="0 0 1 * *">Midnight First of the month</option>
              <option value="custom">Custom</option>
            </select>
              <div>
              {this.state.preset_schedule === "custom" ? (
              <input
                type="text"
                name="schedule"
                value={this.state.schedule}
                onChange={this.scheduleChange}
              />
              ) : (<input
                type="text"
                name="schedule"
                value={this.state.schedule}
                onChange={this.scheduleChange}
                  readOnly
                  disabled
                />
              )}
              
            </div>
          </div>

          <div
            style={{ display: "flex", flexDirection: "row", padding: "10px" }}
          >
            <div style={{ minWidth: "120px" }}>Example Runs:</div>

            {this.state.is_warning_visible ?(
              <div>
                <span style={{ color: "red" }}>Invalid CRON syntax! Please Reference <a href="https://crontab.guru/examples.html">some examples</a></span>
              </div>
            ):null}
          </div>

          {this.state.err ?(<div
            style={{ display: "flex", flexDirection: "row", padding: "10px" }}
          >
            {this.state.err}
          </div>):""}
          {this.state.is_schedule_valid && (
            <div
              style={{ display: "flex", flexDirection: "row", padding: "10px" }}
            >
              <ul>
                {this.state.schedule_examples.map((example, i) => (
                  <li key={i}>{example}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ padding: "10px" }}>
            {this.state.is_schedule_valid && (
              <div>
                <input type="submit" value="Schedule" />
                {this.state.submitted && submissionStatus}
              </div>
            )}
          </div>
        </div>
      </form>
    );
  }
}

/**
 * A Lumino Widget that wraps the react component.
 */
export class AddJob extends ReactWidget {
  constructor(script, script_path) {
    super();
    this.addClass("ReactWidget");

    this.script = script;
    this.script_path = script_path;
  }

  render() {
    return <Component script={this.script} script_path={this.script_path} />;
  }
}
