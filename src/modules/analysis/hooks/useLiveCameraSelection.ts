import {useState} from 'react';
import {LIVE_TRAFFIC_SOURCES} from '../services/live-traffic-sources';

/** Estado compartido de selección, con fuente inicial de la lista aprobada. */
export function useLiveCameraSelection(){
 const [cameraId,setCameraId]=useState(LIVE_TRAFFIC_SOURCES[0].id);
 const camera=LIVE_TRAFFIC_SOURCES.find(source=>source.id===cameraId)??LIVE_TRAFFIC_SOURCES[0];
 return {cameraId,setCameraId,camera};
}
