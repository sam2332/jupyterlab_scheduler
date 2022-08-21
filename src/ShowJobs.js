import { ReactWidget, MainAreaWidget } from '@jupyterlab/apputils';
import { requestAPI } from './api';
import { ViewLog } from './ViewLog';
import React from 'react';


class Jobs extends React.Component {

  constructor(){
    super()

    this.state = {
      jobs: []
    }
  }


  componentDidMount(){
    this.getScheduledJobs()
  }


  openLog(schedule, command){

        
        // Create widget for displaying jobs & attach
        const content = new ViewLog(command, schedule);
        const widget = new MainAreaWidget({ content });
        widget.title.label = `Log - ${command}`;
        widget.title.closable = true;
        widget.id = 'scheduled-job-log';

        this.props.shell.add(widget, 'main');

      

  }

  async getScheduledJobs() {
    try {
      const data = await requestAPI('list');

      if("data" in data){
        this.setState({jobs:data.data})
      }

      console.log("data", data);

    } catch (reason) {
      console.error(`Error fetching jobs: ${reason}`);
    }
  }

  async deleteJob(schedule, command){

    const dataToSend = { 
      command,
      schedule
    };

    try {
      const reply = await requestAPI('delete', {
        body: JSON.stringify(dataToSend),
        method: 'POST'
      });

      // Delete the item the user selected from the state array
      // Particulary complicated because I had to account for the fact that
      // there may be duplicate jobs & the server is just going to remove the first instance
      let jobIndexToRemove = null;
      this.state.jobs.forEach((job, i)=> {
        if(job.command === command && job.schedule === schedule && jobIndexToRemove === null){
          jobIndexToRemove = i;
        }
      });

      if(jobIndexToRemove !== null){
        let updatedJobs = this.state.jobs.filter((job, i) => i !== jobIndexToRemove)

        this.setState({
          jobs:updatedJobs
        })
      }

    } catch (reason) {
      console.error(
        `Error sending delete: ${reason}`
      );
    }

  }

  render() {
    const show_none= this.state.jobs.length==0
    return (
      <div>
        <table class="table table-row" id="CronTab_table">
          <thead>
            <tr>
              <th>Schedule</th>
              <th>Script</th>
              <th>Command</th>
              <th>Log Location</th>
              <th>Log</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
          
            {this.state.jobs.map((job, i)=>(
              <tr key={i} >
                <td>{job.schedule}</td>
                <td>{job.script}</td>
                <td>{job.command}</td>
                <td>{job.log_file}</td>
                <td><button onClick={()=>{this.openLog(job.schedule, job.command)}}>View</button></td>
                <td><button onClick={()=>{this.deleteJob(job.schedule, job.command)}}>X</button></td>

              </tr>
            ))}
            {show_none ? <tr>
                <td colspan='6' class='text-center'>None</td>
              </tr> : ''}

          </tbody>
        </table>
      </div >
    )
  }
}

/**
 * A Lumino Widget that wraps a react component.
 */
export class ViewScheduledJobs extends ReactWidget {

  constructor(shell) {
    super();
    this.addClass('ReactWidget');

    this.shell = shell;
  }

  render() {
    return <Jobs shell={this.shell}/>;
  }
}